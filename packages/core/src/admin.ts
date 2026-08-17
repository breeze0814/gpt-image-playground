import {
  ImageQuality,
  ImageRatio,
  PointLedgerType,
  TaskType,
  UserStatus,
  prisma,
} from "@image-playground/db";
import { creditWithinTransaction } from "./wallet";

export async function dashboardMetrics() {
  const [users, tasks, failedTasks, points, codes] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.imageTask.count(),
    prisma.imageTask.count({ where: { status: "FAILED" } }),
    prisma.pointLedger.aggregate({ _sum: { amount: true } }),
    prisma.redemptionCode.count({ where: { redeemedAt: { not: null } } }),
  ]);
  return { users, tasks, failedTasks, netPoints: points._sum.amount ?? 0, redeemedCodes: codes };
}

export const ADMIN_PAGE_SIZE = 50;

export interface AdminPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listAdminUsers(query?: string, page = 1) {
  const where = {
    deletedAt: null,
    ...(query ? { email: { contains: query, mode: "insensitive" as const } } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      include: { pointAccount: true, _count: { select: { tasks: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, pageSize: ADMIN_PAGE_SIZE };
}

export async function listAdminTasks(page = 1): Promise<AdminPage<Awaited<ReturnType<typeof listAdminTaskRows>>[number]>> {
  const [items, total] = await prisma.$transaction([
    listAdminTaskRows(page),
    prisma.imageTask.count(),
  ]);
  return { items, total, page, pageSize: ADMIN_PAGE_SIZE };
}

function listAdminTaskRows(page: number) {
  return prisma.imageTask.findMany({
    include: { user: { select: { email: true } }, assets: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * ADMIN_PAGE_SIZE,
    take: ADMIN_PAGE_SIZE,
  });
}

export async function listRedemptionBatches(page = 1) {
  const [items, total] = await prisma.$transaction([
    prisma.redemptionBatch.findMany({
      include: { _count: { select: { codes: { where: { redeemedAt: { not: null } } } } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    prisma.redemptionBatch.count(),
  ]);
  return { items, total, page, pageSize: ADMIN_PAGE_SIZE };
}

export async function setUserStatus(
  adminId: string,
  userId: string,
  status: UserStatus,
): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { status } }),
    prisma.adminAuditLog.create({ data: {
      actorId: adminId,
      action: "USER_STATUS_CHANGED",
      targetType: "User",
      targetId: userId,
      details: { status },
    } }),
  ]);
}

export async function adjustUserPoints(input: {
  adminId: string;
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await creditWithinTransaction(tx, {
      userId: input.userId,
      amount: input.amount,
      type: PointLedgerType.ADMIN_ADJUSTMENT,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
    });
    await tx.adminAuditLog.create({ data: {
      actorId: input.adminId,
      action: "POINTS_ADJUSTED",
      targetType: "User",
      targetId: input.userId,
      details: { amount: input.amount, reason: input.reason },
    } });
  });
}

export async function updatePricing(input: {
  type: TaskType;
  ratio: ImageRatio;
  quality: ImageQuality;
  pointCost: number;
}): Promise<void> {
  await prisma.pricingRule.upsert({
    where: { type_ratio_quality: {
      type: input.type,
      ratio: input.ratio,
      quality: input.quality,
    } },
    update: { pointCost: input.pointCost, active: true },
    create: { ...input, active: true },
  });
}

export async function listPricing() {
  return prisma.pricingRule.findMany({ orderBy: [{ type: "asc" }, { quality: "asc" }] });
}
