import { adjustUserPoints, setUserStatus } from "@image-playground/core";
import { UserStatus } from "@image-playground/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { requireApiAdmin } from "@/lib/session";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), status: z.enum(UserStatus) }),
  z.object({
    action: z.literal("points"),
    amount: z.number().int().refine((value) => value !== 0),
    reason: z.string().trim().min(2).max(200),
    idempotencyKey: z.string().uuid(),
  }),
]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiAdmin();
    const { id } = await context.params;
    const input = actionSchema.parse(await request.json());
    if (input.action === "status") {
      await setUserStatus(session.user.id, id, input.status);
    } else {
      await adjustUserPoints({ adminId: session.user.id, userId: id, ...input });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
