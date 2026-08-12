import { listPricing } from "@image-playground/core";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/session";

export async function GET() {
  try {
    await requireApiUser();
    return NextResponse.json(await listPricing());
  } catch (error) {
    return apiError(error);
  }
}
