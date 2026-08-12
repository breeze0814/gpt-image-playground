import {
  createObjectKey,
  DomainError,
  uploadRequestSchema,
  writeObject,
} from "@image-playground/core";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const session = await requireApiUser();
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
