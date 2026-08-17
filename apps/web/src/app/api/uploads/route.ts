import {
  consumeRateLimit,
  createObjectKey,
  DomainError,
  MAX_UPLOAD_BYTES,
  uploadRequestSchema,
  writeObject,
} from "@image-playground/core";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/session";

// multipart 表单除文件本体外还有少量元数据开销
const MAX_MULTIPART_BODY_BYTES = MAX_UPLOAD_BYTES + 2 * 1024 * 1024;
const UPLOAD_RATE_LIMIT = { limit: 20, windowSeconds: 60 };

export async function POST(request: Request) {
  try {
    const session = await requireApiUser();
    await consumeRateLimit("upload", session.user.id, UPLOAD_RATE_LIMIT);
    const declaredLength = request.headers.get("content-length");
    if (declaredLength) {
      const length = Number(declaredLength);
      if (Number.isFinite(length) && length > MAX_MULTIPART_BODY_BYTES) {
        throw new DomainError("UPLOAD_TOO_LARGE", "上传内容超过大小限制", 413);
      }
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new DomainError("UPLOAD_FILE_REQUIRED", "上传请求缺少图片文件");
    }
    const input = uploadRequestSchema.parse({
      mimeType: file.type,
      bytes: file.size,
      purpose: form.get("purpose") ?? undefined,
    });
    const objectKey = createObjectKey(session.user.id, input.mimeType, input.purpose);
    await writeObject(objectKey, Buffer.from(await file.arrayBuffer()), input.mimeType);
    return NextResponse.json({ objectKey, mimeType: input.mimeType, bytes: input.bytes });
  } catch (error) {
    return apiError(error);
  }
}
