import { cancelImageTask, getOwnedTask, toTaskView } from "@image-playground/core";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/session";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireApiUser();
    const { id } = await context.params;
    return NextResponse.json(await toTaskView(await getOwnedTask(session.user.id, id)));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireApiUser();
    const { id } = await context.params;
    const cancelled = await cancelImageTask(session.user.id, id);
    return NextResponse.json({ cancelled });
  } catch (error) {
    return apiError(error);
  }
}
