import { listAdminUsers } from "@image-playground/core";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiAdmin } from "@/lib/session";

export async function GET(request: Request) {
  try {
    await requireApiAdmin();
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? undefined;
    const rawPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
    const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
    return NextResponse.json(await listAdminUsers(query, page));
  } catch (error) {
    return apiError(error);
  }
}
