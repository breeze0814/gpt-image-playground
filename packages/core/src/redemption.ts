import { PointLedgerType, prisma } from "@image-playground/db";
import { createHash, randomBytes } from "node:crypto";
import { DomainError } from "./errors";
import { creditWithinTransaction } from "./wallet";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replaceAll(" ", "");
}

export function hashRedemptionCode(code: string): string {
  return createHash("sha256").update(normalizeCode(code)).digest("hex");
}

function generateCode(): string {
  const token = randomBytes(12).toString("hex").toUpperCase();
  return `IMG-${token.slice(0, 6)}-${token.slice(6, 12)}-${token.slice(12, 18)}`;
}

export async function createRedemptionBatch(input: {
  name: string;
  pointValue: number;
  quantity: number;
  expiresAt?: Date;
  adminId: string;
}) {
  const codes = Array.from({ length: input.quantity }, generateCode);
  // 大批量建码可能超过交互式事务默认的 5 秒超时
  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.redemptionBatch.create({
      data: {
        name: input.name,
        pointValue: input.pointValue,
        quantity: input.quantity,
        createdById: input.adminId,
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
        codes: {
          create: codes.map((code) => ({
            codeHash: hashRedemptionCode(code),
            codeSuffix: code.slice(-6),
          })),
        },
      },
    });
    await tx.adminAuditLog.create({ data: {
      actorId: input.adminId,
      action: "REDEMPTION_BATCH_CREATED",
      targetType: "RedemptionBatch",
      targetId: created.id,
      details: { name: input.name, pointValue: input.pointValue, quantity: input.quantity, expiresAt: input.expiresAt?.toISOString() ?? null },
    } });
    return created;
  }, { timeout: 60_000 });
  return { batch, codes };
}

function assertRedeemable(code: {
  redeemedAt: Date | null;
  batch: { disabledAt: Date | null; expiresAt: Date | null };
}): void {
  if (code.redeemedAt) throw new DomainError("CODE_USED", "兑换码已使用", 409);
  if (code.batch.disabledAt) throw new DomainError("BATCH_DISABLED", "兑换码批次已停用");
  if (code.batch.expiresAt && code.batch.expiresAt <= new Date()) {
    throw new DomainError("CODE_EXPIRED", "兑换码已过期");
  }
}

export async function redeemCode(userId: string, rawCode: string) {
  const codeHash = hashRedemptionCode(rawCode);
  return prisma.$transaction(async (tx) => {
    const code = await tx.redemptionCode.findUnique({
      where: { codeHash },
      include: { batch: true },
    });
    if (!code) throw new DomainError("CODE_NOT_FOUND", "兑换码无效", 404);
    assertRedeemable(code);
    const claimed = await tx.redemptionCode.updateMany({
      where: { id: code.id, redeemedAt: null },
      data: { redeemedAt: new Date(), redeemedById: userId },
    });
    if (claimed.count !== 1) throw new DomainError("CODE_USED", "兑换码已使用", 409);
    await creditWithinTransaction(tx, {
      userId,
      amount: code.batch.pointValue,
      type: PointLedgerType.REDEEM,
      reason: `兑换码批次：${code.batch.name}`,
      idempotencyKey: `redeem:${code.id}`,
    });
    return { points: code.batch.pointValue };
  });
}
