import {
  getServiceConfigView,
  serviceConfigUpdateSchema,
  updateServiceConfig,
} from "@image-playground/core";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiAdmin } from "@/lib/session";

export async function GET() {
  try {
    await requireApiAdmin();
    return NextResponse.json(await getServiceConfigView());
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireApiAdmin();
    const input = serviceConfigUpdateSchema.parse(await request.json());
    return NextResponse.json(await updateServiceConfig(input, session.user.id));
  } catch (error) {
    return apiError(error);
  }
}
