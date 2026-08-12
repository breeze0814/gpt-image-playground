import {
  createImageTask,
  createTaskSchema,
  listRecentTasks,
  toTaskView,
} from "@image-playground/core";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireApiUser();
    const tasks = await listRecentTasks(session.user.id);
    return NextResponse.json(await Promise.all(tasks.map(toTaskView)));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiUser();
    const input = createTaskSchema.parse(await request.json());
    const task = await createImageTask(session.user.id, input);
    return NextResponse.json({ id: task.id, status: task.status }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
