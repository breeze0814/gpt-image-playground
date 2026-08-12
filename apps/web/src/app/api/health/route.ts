import { prisma } from "@image-playground/db";
import { redisConnection } from "@image-playground/core";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await Promise.all([prisma.$queryRaw`SELECT 1`, redisConnection().ping()]);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
