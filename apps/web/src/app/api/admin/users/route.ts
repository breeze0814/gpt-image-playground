import { listAdminUsers } from "@image-playground/core";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiAdmin } from "@/lib/session";

export async function GET(request: Request) {
  try {
    await requireApiAdmin();
    const query = new URL(request.url).searchParams.get("q") ?? undefined;
    return NextResponse.json(await listAdminUsers(query));
  } catch (error) {
    return apiError(error);
  }
}
