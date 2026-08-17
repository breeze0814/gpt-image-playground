import {
  ImageQuality,
  ImageRatio,
  PointLedgerType,
  TaskType,
  prisma,
} from "@image-playground/db";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  claimImageTask,
  completeImageTask,
  createImageTask,
  createRedemptionBatch,
  dailyCheckIn,
  grantPoints,
  getServiceConfigView,
  processImageTask,
  purgeExpiredTaskAssets,
  recoverStaleTasks,
  redeemCode,
  requireEmailConfig,
  requireStorageConfig,
  updateServiceConfig,
} from "../src/index.js";

const SERVICE_SECRET = "integration-s3-secret";
const EMAIL_SECRET = "integration-email-secret";

const databaseTestsEnabled = process.env.DATABASE_URL?.includes("image_playground_test") === true;
const integration = describe.runIf(databaseTestsEnabled);

async function resetDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.adminAuditLog.deleteMany(),
    prisma.redemptionCode.deleteMany(),
    prisma.redemptionBatch.deleteMany(),
    prisma.dailyCheckIn.deleteMany(),
    prisma.pointLedger.deleteMany(),
    prisma.taskAsset.deleteMany(),
    prisma.imageTask.deleteMany(),
    prisma.pricingRule.deleteMany(),
    prisma.appSetting.deleteMany(),
    prisma.pointAccount.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verification.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function createUser(email: string, role: "USER" | "ADMIN" = "USER") {
  return prisma.user.create({
    data: { email, name: email.split("@")[0] ?? "User", emailVerified: true, role, pointAccount: { create: {} } },
  });
}

integration("数据库并发规则", () => {
  beforeEach(resetDatabase);
  afterAll(() => prisma.$disconnect());

  it("并发扣积分时不会透支", async () => {
    const user = await createUser("wallet@example.com");
    await grantPoints({ userId: user.id, amount: 10, type: PointLedgerType.WELCOME, reason: "test", idempotencyKey: "welcome" });
    const results = await Promise.allSettled(["a", "b"].map((key) => grantPoints({ userId: user.id, amount: -8, type: PointLedgerType.ADMIN_ADJUSTMENT, reason: "test", idempotencyKey: key })));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.pointAccount.findUnique({ where: { userId: user.id } })).toMatchObject({ balance: 2, frozen: 0 });
  });

  it("同一兑换码并发兑换只能成功一次", async () => {
    const [admin, user] = await Promise.all([createUser("admin@example.com", "ADMIN"), createUser("redeem@example.com")]);
    const { codes } = await createRedemptionBatch({ name: "并发测试", pointValue: 20, quantity: 1, adminId: admin.id });
    const code = codes[0];
    if (!code) throw new Error("测试兑换码未生成");
    const results = await Promise.allSettled([redeemCode(user.id, code), redeemCode(user.id, code)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.pointAccount.findUnique({ where: { userId: user.id } })).toMatchObject({ balance: 20 });
  });

  it("同一天只能签到一次", async () => {
    const user = await createUser("checkin@example.com");
    await prisma.appSetting.createMany({ data: [{ key: "checkInMin", value: 3 }, { key: "checkInMax", value: 3 }] });
    const results = await Promise.allSettled([dailyCheckIn(user.id), dailyCheckIn(user.id)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.pointAccount.findUnique({ where: { userId: user.id } })).toMatchObject({ balance: 3 });
  });

  it("自定义图像 API 配置失败后退回全部冻结积分", async () => {
    const user = await createUser("task@example.com");
    await grantPoints({ userId: user.id, amount: 10, type: PointLedgerType.WELCOME, reason: "test", idempotencyKey: "task-welcome" });
    await prisma.pricingRule.create({ data: { type: TaskType.GENERATE, ratio: ImageRatio.SQUARE, quality: ImageQuality.STANDARD, pointCost: 4 } });
    const task = await createImageTask(user.id, { type: TaskType.GENERATE, prompt: "test", ratio: ImageRatio.SQUARE, quality: ImageQuality.STANDARD, idempotencyKey: crypto.randomUUID() });
    expect(await prisma.pointAccount.findUnique({ where: { userId: user.id } })).toMatchObject({ balance: 6, frozen: 4 });
    await expect(processImageTask(task.id)).rejects.toThrow("服务配置尚未在管理后台保存");
    expect(await prisma.pointAccount.findUnique({ where: { userId: user.id } })).toMatchObject({ balance: 10, frozen: 0 });
  });

  it("worker 崩溃后重新投递的任务可以再次认领，已有结果则不再认领", async () => {
    const user = await createUser("reclaim@example.com");
    await grantPoints({ userId: user.id, amount: 10, type: PointLedgerType.WELCOME, reason: "test", idempotencyKey: "reclaim-welcome" });
    await prisma.pricingRule.create({ data: { type: TaskType.GENERATE, ratio: ImageRatio.SQUARE, quality: ImageQuality.STANDARD, pointCost: 4 } });
    const task = await createImageTask(user.id, { type: TaskType.GENERATE, prompt: "reclaim", ratio: ImageRatio.SQUARE, quality: ImageQuality.STANDARD, idempotencyKey: crypto.randomUUID() });
    expect(await claimImageTask(task.id)).toBe(true);
    // BullMQ 检测到 worker 失联后重新投递 job，此时状态仍为 RUNNING 且没有结果
    expect(await claimImageTask(task.id)).toBe(true);
    await completeImageTask(task.id, { objectKey: `results/${user.id}/${task.id}/result.webp`, mimeType: "image/webp", bytes: 100 });
    // 已生成结果后不再认领，避免重复调用上游
    expect(await claimImageTask(task.id)).toBe(false);
  });

  it("回收扫描退款超时任务并重新入队卡在队列中的任务", async () => {
    const user = await createUser("recovery@example.com");
    await grantPoints({ userId: user.id, amount: 20, type: PointLedgerType.WELCOME, reason: "test", idempotencyKey: "recovery-welcome" });
    await prisma.pricingRule.create({ data: { type: TaskType.GENERATE, ratio: ImageRatio.SQUARE, quality: ImageQuality.STANDARD, pointCost: 4 } });
    const staleRunning = await createImageTask(user.id, { type: TaskType.GENERATE, prompt: "stale-running", ratio: ImageRatio.SQUARE, quality: ImageQuality.STANDARD, idempotencyKey: crypto.randomUUID() });
    const staleQueued = await createImageTask(user.id, { type: TaskType.GENERATE, prompt: "stale-queued", ratio: ImageRatio.SQUARE, quality: ImageQuality.STANDARD, idempotencyKey: crypto.randomUUID() });
    await prisma.imageTask.update({ where: { id: staleRunning.id }, data: { status: "RUNNING", startedAt: new Date(Date.now() - 20 * 60 * 1000) } });
    await prisma.imageTask.update({ where: { id: staleQueued.id }, data: { createdAt: new Date(Date.now() - 20 * 60 * 1000) } });
    const result = await recoverStaleTasks();
    expect(result).toMatchObject({ failedRunning: 1, requeued: 1, failedQueued: 0 });
    expect(await prisma.imageTask.findUnique({ where: { id: staleRunning.id } })).toMatchObject({ status: "FAILED", errorCode: "TASK_TIMEOUT" });
    // 超时任务已退款；重新入队的任务仍冻结积分
    expect(await prisma.pointAccount.findUnique({ where: { userId: user.id } })).toMatchObject({ balance: 16, frozen: 4 });
  });

  it("清理过期资产时单个任务对象缺失不中断整批清理", async () => {
    const user = await createUser("cleanup@example.com");
    const directory = await mkdtemp(path.join(os.tmpdir(), "ip-cleanup-"));
    await updateServiceConfig({
      storage: { provider: "LOCAL", localPath: directory, endpoint: "", region: "", bucket: "", accessKeyId: "", secretAccessKey: "", clearSecretAccessKey: false, forcePathStyle: false },
      imageApi: { baseUrl: "", model: "", generatePath: "generate", editPath: "edit", apiKey: "", clearApiKey: false },
      email: { host: "", port: 587, secure: false, from: "", user: "", password: "", clearPassword: false },
    });
    const createExpired = async (suffix: string) => prisma.imageTask.create({
      data: {
        userId: user.id,
        type: TaskType.GENERATE,
        status: "SUCCEEDED",
        prompt: `cleanup-${suffix}`,
        ratio: ImageRatio.SQUARE,
        quality: ImageQuality.STANDARD,
        pointCost: 4,
        idempotencyKey: crypto.randomUUID(),
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        assets: { create: { role: "RESULT", objectKey: `results/${user.id}/cleanup-${suffix}.webp`, mimeType: "image/webp", bytes: 4 } },
      },
    });
    const withFile = await createExpired("a");
    const missingFile = await createExpired("b");
    await mkdir(path.join(directory, "results", user.id), { recursive: true });
    await writeFile(path.join(directory, "results", user.id, `cleanup-a.webp`), "test");
    // b 的对象在上一轮清理中已被删除，重试时不应报错
    expect(await purgeExpiredTaskAssets()).toBe(2);
    expect(await prisma.taskAsset.count({ where: { taskId: { in: [withFile.id, missingFile.id] } } })).toBe(0);
    expect(await prisma.imageTask.findUnique({ where: { id: withFile.id } })).toMatchObject({ assetsPurgedAt: expect.any(Date) });
  });

  it("服务密钥只以密文保存并可在服务端解密", async () => {
    await updateServiceConfig({
      storage: { provider: "S3", localPath: "./storage", endpoint: "https://s3.example.test", region: "test-1", bucket: "images", accessKeyId: "access-key", secretAccessKey: SERVICE_SECRET, clearSecretAccessKey: false, forcePathStyle: true },
      imageApi: { baseUrl: "https://images.example.test/v1", model: "image-model", generatePath: "generate", editPath: "edit", apiKey: "api-secret", clearApiKey: false },
      email: { host: "smtp.example.test", port: 587, secure: false, from: "noreply@example.test", user: "mailer", password: EMAIL_SECRET, clearPassword: false },
    });
    const stored = await prisma.appSetting.findUniqueOrThrow({ where: { key: "serviceConfig" } });
    expect(JSON.stringify(stored.value)).not.toContain(SERVICE_SECRET);
    expect(JSON.stringify(stored.value)).not.toContain(EMAIL_SECRET);
    const [view, storage, email] = await Promise.all([getServiceConfigView(), requireStorageConfig(), requireEmailConfig()]);
    expect(view).toMatchObject({ configured: true, storage: { hasSecretAccessKey: true }, email: { hasPassword: true } });
    expect(storage).toMatchObject({ provider: "S3", secretAccessKey: SERVICE_SECRET });
    expect(email).toMatchObject({ password: EMAIL_SECRET });
  });
});
