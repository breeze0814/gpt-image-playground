import { getTodayCheckIn, getWallet } from "@image-playground/core";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireApiUser();
    const [wallet, checkIn] = await Promise.all([
      getWallet(session.user.id),
      getTodayCheckIn(session.user.id),
    ]);
    return NextResponse.json({ balance: wallet.balance, checkedIn: checkIn !== null });
  } catch (error) {
    return apiError(error);
  }
}
