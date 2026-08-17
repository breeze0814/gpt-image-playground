import { createRedemptionBatch } from "@image-playground/core";
import { prisma } from "@image-playground/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { requireApiAdmin } from "@/lib/session";

const batchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  pointValue: z.number().int().positive().max(100_000),
  quantity: z.number().int().positive().max(10_000),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function GET() {
  try {
    await requireApiAdmin();
    const batches = await prisma.redemptionBatch.findMany({
      include: { _count: { select: { codes: true } }, codes: { where: { redeemedAt: { not: null } }, select: { id: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(batches);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiAdmin();
    const input = batchSchema.parse(await request.json());
    const result = await createRedemptionBatch({
      name: input.name,
      pointValue: input.pointValue,
      quantity: input.quantity,
      adminId: session.user.id,
      ...(input.expiresAt ? { expiresAt: new Date(input.expiresAt) } : {}),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

const disableSchema = z.object({ batchId: z.string().min(1), disabled: z.boolean() });

export async function PATCH(request: Request) {
  try {
    const session = await requireApiAdmin();
    const input = disableSchema.parse(await request.json());
    await prisma.$transaction([
      prisma.redemptionBatch.update({
        where: { id: input.batchId },
        data: { disabledAt: input.disabled ? new Date() : null },
      }),
      prisma.adminAuditLog.create({
        data: {
          actorId: session.user.id,
          action: input.disabled ? "REDEMPTION_BATCH_DISABLED" : "REDEMPTION_BATCH_ENABLED",
          targetType: "RedemptionBatch",
          targetId: input.batchId,
          details: {},
        },
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
