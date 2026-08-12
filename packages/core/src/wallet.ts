import {
  PointLedgerType,
  Prisma,
  prisma,
} from "@image-playground/db";
import { DomainError } from "./errors";

export interface CreditInput {
  userId: string;
  amount: number;
  type: PointLedgerType;
  reason: string;
  idempotencyKey: string;
  taskId?: string;
}

interface LockedAccount {
  id: string;
  userId: string;
  balance: number;
  frozen: number;
}

export async function lockPointAccount(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<LockedAccount> {
  await tx.pointAccount.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  const accounts = await tx.$queryRaw<LockedAccount[]>`
    SELECT "id", "userId", "balance", "frozen"
    FROM "PointAccount"
    WHERE "userId" = ${userId}
    FOR UPDATE
  `;
  const account = accounts[0];
  if (!account) throw new DomainError("ACCOUNT_NOT_FOUND", "积分账户不存在", 500);
  return account;
}

export async function creditWithinTransaction(
  tx: Prisma.TransactionClient,
  input: CreditInput,
): Promise<void> {
  const existing = await tx.pointLedger.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return;

  const account = await lockPointAccount(tx, input.userId);
  const balanceAfter = account.balance + input.amount;
  if (balanceAfter < 0) throw new DomainError("INSUFFICIENT_POINTS", "积分余额不足");
  await tx.pointAccount.update({
    where: { userId: input.userId },
    data: { balance: balanceAfter },
  });
  await tx.pointLedger.create({
    data: {
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      balanceAfter,
      frozenAfter: account.frozen,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      ...(input.taskId ? { taskId: input.taskId } : {}),
    },
  });
}

export async function grantPoints(input: CreditInput): Promise<void> {
  await prisma.$transaction((tx) => creditWithinTransaction(tx, input));
}

export async function getWallet(userId: string) {
  return prisma.pointAccount.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: {
      user: { select: { email: true, name: true } },
    },
  });
}

export async function listPointLedgers(userId: string, take = 50) {
  return prisma.pointLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}
