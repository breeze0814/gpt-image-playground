import { listAdminTasks, toTaskView } from "@image-playground/core";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiAdmin } from "@/lib/session";

export async function GET() {
  try {
    await requireApiAdmin();
    const tasks = await listAdminTasks();
    const views = await Promise.all(tasks.map(async (task) => ({
      ...(await toTaskView(task)),
      user: task.user,
    })));
    return NextResponse.json(views);
  } catch (error) {
    return apiError(error);
  }
}
