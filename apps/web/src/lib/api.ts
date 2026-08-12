import { DomainError } from "@image-playground/core";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

const BAD_REQUEST_STATUS = 400;
const INTERNAL_SERVER_ERROR_STATUS = 500;

export function apiError(error: unknown): NextResponse {
  if (error instanceof DomainError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof ZodError) {
    const message = error.issues.map((issue) => issue.message).join("；");
    return NextResponse.json({ error: message, code: "INVALID_INPUT" }, { status: BAD_REQUEST_STATUS });
  }
  console.error(error);
  return NextResponse.json({ error: "服务器内部错误", code: "INTERNAL_ERROR" }, { status: INTERNAL_SERVER_ERROR_STATUS });
}
