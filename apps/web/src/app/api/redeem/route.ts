import { redeemCode } from "@image-playground/core";
import { z } from "zod";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/session";

const redeemSchema = z.object({ code: z.string().trim().min(8).max(100) });

export async function POST(request: Request) {
  try {
    const session = await requireApiUser();
    const input = redeemSchema.parse(await request.json());
    return NextResponse.json(await redeemCode(session.user.id, input.code));
  } catch (error) {
    return apiError(error);
  }
}
