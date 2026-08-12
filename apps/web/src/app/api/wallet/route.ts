import { getTodayCheckIn, getWallet, listPointLedgers } from "@image-playground/core";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireApiUser();
    const [wallet, ledgers, todayCheckIn] = await Promise.all([
      getWallet(session.user.id),
      listPointLedgers(session.user.id),
      getTodayCheckIn(session.user.id),
    ]);
    return NextResponse.json({ wallet, ledgers, todayCheckIn });
  } catch (error) {
    return apiError(error);
  }
}
