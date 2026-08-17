import {
  AssetRole,
  PointLedgerType,
  Prisma,
  TaskStatus,
  TaskType,
  UserStatus,
  prisma,
} from "@image-playground/db";
import { TASK_QUEUED_TIMEOUT_MS, TASK_RECOVERY_BATCH_SIZE, TASK_RUNNING_TIMEOUT_MS } from "./constants";
import { subDays } from "./time";
import { DomainError, errorMessage } from "./errors";
import { enqueueImageTask } from "./queue";
import type { AssetInput, CreateTaskInput } from "./schemas";
import { validateOwnedAsset } from "./storage";
import { lockPointAccount } from "./wallet";

interface ResultAssetInput {
  objectKey: string;
  mimeType: string;
  bytes: number;
  providerRequestId?: string;
}

function inputAssets(input: CreateTaskInput): ReadonlyArray<AssetInput> {
  return input.type === TaskType.EDIT
    ? [input.primary, ...input.references]
    : [];
}

async function validateAssets(userId: string, input: CreateTaskInput): Promise<void> {
  await Promise.all(inputAssets(input).map((asset) => validateOwnedAsset(userId, asset)));
}

async function loadPrice(tx: Prisma.TransactionClient, input: CreateTaskInput) {
  const pricing = await tx.pricingRule.findUnique({
    where: { type_ratio_quality: {
      type: input.type,
      ratio: input.ratio,
      quality: input.quality,
    } },
  });
  if (!pricing?.active) throw new DomainError("PRICE_NOT_CONFIGURED", "当前规格未配置积分价格");
  return pricing.pointCost;
}

function assetCreateData(input: CreateTaskInput) {
  if (input.type !== TaskType.EDIT) return [];
  return [
    { ...input.primary, role: AssetRole.PRIMARY },
    ...input.references.map((asset) => ({ ...asset, role: AssetRole.REFERENCE })),
  ];
}

async function createTaskTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  input: CreateTaskInput,
) {
  const existing = await tx.imageTask.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return existing;
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
    throw new DomainError("USER_DISABLED", "账户不可用", 403);
  }
  const pointCost = await loadPrice(tx, input);
  const account = await lockPointAccount(tx, userId);
  if (account.balance < pointCost) throw new DomainError("INSUFFICIENT_POINTS", "积分余额不足");
  const task = await tx.imageTask.create({
    data: {
      userId,
      type: input.type,
      prompt: input.prompt,
      ratio: input.ratio,
      quality: input.quality,
      pointCost,
      idempotencyKey: input.idempotencyKey,
      assets: { create: assetCreateData(input) },
    },
  });
  await reserveTaskPoints(tx, task.id, userId, pointCost, account);
  return task;
}

async function reserveTaskPoints(
  tx: Prisma.TransactionClient,
  taskId: string,
  userId: string,
  pointCost: number,
  account: { balance: number; frozen: number },
): Promise<void> {
  const balanceAfter = account.balance - pointCost;
  const frozenAfter = account.frozen + pointCost;
  await tx.pointAccount.update({ where: { userId }, data: { balance: balanceAfter, frozen: frozenAfter } });
  await tx.pointLedger.create({ data: {
    userId,
    taskId,
    type: PointLedgerType.TASK_RESERVE,
    amount: -pointCost,
    balanceAfter,
    frozenAfter,
    reason: "图像任务冻结积分",
    idempotencyKey: `task-reserve:${taskId}`,
  } });
}

export async function createImageTask(userId: string, input: CreateTaskInput) {
  await validateAssets(userId, input);
  const task = await prisma.$transaction((tx) => createTaskTransaction(tx, userId, input));
  if (task.status !== TaskStatus.QUEUED) return task;
  try {
    await enqueueImageTask(task.id);
  } catch (error) {
    await failImageTask(task.id, "QUEUE_ENQUEUE_FAILED", errorMessage(error));
    throw error;
  }
  return task;
}

export async function claimImageTask(taskId: string): Promise<boolean> {
  // 任务可能因 worker 崩溃被 BullMQ 重新投递，此时状态仍是 RUNNING 且没有结果，
  // 允许重新认领以便自动重试；已有 RESULT 的视为已成功，不再认领。
  const result = await prisma.imageTask.updateMany({
    where: {
      id: taskId,
      OR: [
        { status: TaskStatus.QUEUED },
        { status: TaskStatus.RUNNING, assets: { none: { role: AssetRole.RESULT } } },
      ],
    },
    data: { status: TaskStatus.RUNNING, startedAt: new Date(), errorCode: null, errorMessage: null },
  });
  return result.count === 1;
}

export interface TaskRecoveryResult {
  failedRunning: number;
  requeued: number;
  failedQueued: number;
}

export async function recoverStaleTasks(): Promise<TaskRecoveryResult> {
  const runningCutoff = new Date(Date.now() - TASK_RUNNING_TIMEOUT_MS);
  const queuedCutoff = new Date(Date.now() - TASK_QUEUED_TIMEOUT_MS);
  const [staleRunning, staleQueued] = await Promise.all([
    prisma.imageTask.findMany({
      where: {
        status: TaskStatus.RUNNING,
        startedAt: { lt: runningCutoff },
        assets: { none: { role: AssetRole.RESULT } },
      },
      select: { id: true },
      take: TASK_RECOVERY_BATCH_SIZE,
    }),
    prisma.imageTask.findMany({
      where: { status: TaskStatus.QUEUED, createdAt: { lt: queuedCutoff } },
      select: { id: true },
      take: TASK_RECOVERY_BATCH_SIZE,
    }),
  ]);

  let failedRunning = 0;
  for (const task of staleRunning) {
    const released = await failImageTask(task.id, "TASK_TIMEOUT", "任务处理超时，冻结积分已退回");
    if (released) failedRunning += 1;
  }

  let requeued = 0;
  let failedQueued = 0;
  for (const task of staleQueued) {
    try {
      await enqueueImageTask(task.id);
      requeued += 1;
    } catch (error) {
      const released = await failImageTask(task.id, "QUEUE_ENQUEUE_FAILED", errorMessage(error));
      if (released) failedQueued += 1;
    }
  }
  return { failedRunning, requeued, failedQueued };
}

export async function loadImageTask(taskId: string) {
  const task = await prisma.imageTask.findUnique({
    where: { id: taskId },
    include: { assets: true },
  });
  if (!task) throw new DomainError("TASK_NOT_FOUND", "任务不存在", 404);
  return task;
}

async function settleTaskTransaction(
  tx: Prisma.TransactionClient,
  taskId: string,
  result: ResultAssetInput,
): Promise<void> {
  const task = await tx.imageTask.findUnique({ where: { id: taskId } });
  if (!task || task.status !== TaskStatus.RUNNING) {
    throw new DomainError("INVALID_TASK_STATE", "任务不处于处理中状态", 409);
  }
  const account = await lockPointAccount(tx, task.userId);
  if (account.frozen < task.pointCost) throw new DomainError("FROZEN_POINTS_MISMATCH", "冻结积分不足", 500);
  const frozenAfter = account.frozen - task.pointCost;
  await tx.taskAsset.create({ data: {
    taskId,
    role: AssetRole.RESULT,
    objectKey: result.objectKey,
    mimeType: result.mimeType,
    bytes: result.bytes,
  } });
  await tx.pointAccount.update({ where: { userId: task.userId }, data: { frozen: frozenAfter } });
  await tx.pointLedger.create({ data: {
    userId: task.userId,
    taskId,
    type: PointLedgerType.TASK_SETTLE,
    amount: 0,
    balanceAfter: account.balance,
    frozenAfter,
    reason: "图像任务完成并结算",
    idempotencyKey: `task-settle:${taskId}`,
  } });
  await tx.imageTask.update({ where: { id: taskId }, data: {
    status: TaskStatus.SUCCEEDED,
    finishedAt: new Date(),
    ...(result.providerRequestId ? { providerRequestId: result.providerRequestId } : {}),
  } });
}

export async function completeImageTask(taskId: string, result: ResultAssetInput): Promise<void> {
  await prisma.$transaction((tx) => settleTaskTransaction(tx, taskId, result));
}

async function releaseTaskTransaction(
  tx: Prisma.TransactionClient,
  taskId: string,
  status: typeof TaskStatus.FAILED | typeof TaskStatus.CANCELLED,
  errorCode: string,
  errorText: string,
): Promise<boolean> {
  const task = await tx.imageTask.findUnique({ where: { id: taskId } });
  if (!task) return false;
  if (task.status !== TaskStatus.QUEUED && task.status !== TaskStatus.RUNNING) return false;
  const account = await lockPointAccount(tx, task.userId);
  if (account.frozen < task.pointCost) throw new DomainError("FROZEN_POINTS_MISMATCH", "冻结积分不足", 500);
  const balanceAfter = account.balance + task.pointCost;
  const frozenAfter = account.frozen - task.pointCost;
  await tx.pointAccount.update({ where: { userId: task.userId }, data: { balance: balanceAfter, frozen: frozenAfter } });
  await tx.pointLedger.create({ data: {
    userId: task.userId,
    taskId,
    type: PointLedgerType.TASK_RELEASE,
    amount: task.pointCost,
    balanceAfter,
    frozenAfter,
    reason: status === TaskStatus.CANCELLED ? "任务取消退回积分" : "任务失败退回积分",
    idempotencyKey: `task-release:${taskId}`,
  } });
  await tx.imageTask.update({ where: { id: taskId }, data: {
    status,
    errorCode,
    errorMessage: errorText,
    finishedAt: new Date(),
  } });
  return true;
}

export async function failImageTask(taskId: string, code: string, message: string): Promise<boolean> {
  return prisma.$transaction((tx) => releaseTaskTransaction(tx, taskId, TaskStatus.FAILED, code, message));
}

export async function cancelImageTask(userId: string, taskId: string): Promise<boolean> {
  const task = await prisma.imageTask.findFirst({ where: { id: taskId, userId } });
  if (!task) throw new DomainError("TASK_NOT_FOUND", "任务不存在", 404);
  return prisma.$transaction((tx) => releaseTaskTransaction(
    tx,
    taskId,
    TaskStatus.CANCELLED,
    "USER_CANCELLED",
    "用户取消任务",
  ));
}

export async function listRecentTasks(userId: string) {
  return prisma.imageTask.findMany({
    where: { userId, createdAt: { gte: subDays(new Date(), 7) } },
    include: { assets: true },
    orderBy: { createdAt: "desc" },
    take: 24,
  });
}

export async function getOwnedTask(userId: string, taskId: string) {
  const task = await prisma.imageTask.findFirst({
    where: { id: taskId, userId },
    include: { assets: true },
  });
  if (!task) throw new DomainError("TASK_NOT_FOUND", "任务不存在", 404);
  return task;
}
