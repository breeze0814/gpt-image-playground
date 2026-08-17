import { consumeRateLimit, dailyCheckIn, getTodayCheckIn } from "@image-playground/core";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/session";

const CHECK_IN_RATE_LIMIT = { limit: 5, windowSeconds: 60 };

export async function GET() {
  try {
    const session = await requireApiUser();
    return NextResponse.json(await getTodayCheckIn(session.user.id));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST() {
  try {
    const session = await requireApiUser();
    await consumeRateLimit("check-in", session.user.id, CHECK_IN_RATE_LIMIT);
    return NextResponse.json(await dailyCheckIn(session.user.id), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
