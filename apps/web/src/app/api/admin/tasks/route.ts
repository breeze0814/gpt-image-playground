import { listAdminTasks, toTaskView } from "@image-playground/core";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiAdmin } from "@/lib/session";

export async function GET(request: Request) {
  try {
    await requireApiAdmin();
    const rawPage = Number.parseInt(new URL(request.url).searchParams.get("page") ?? "1", 10);
    const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
    const { items, total, pageSize } = await listAdminTasks(page);
    const views = await Promise.all(items.map(async (task) => ({
      ...(await toTaskView(task)),
      user: task.user,
    })));
    return NextResponse.json({ items: views, total, page, pageSize });
  } catch (error) {
    return apiError(error);
  }
}
