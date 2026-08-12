import { apiRequest } from "./client-api";

const MAX_BYTES = 10 * 1024 * 1024;
const MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export interface UploadedAsset {
  objectKey: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  bytes: number;
}

function validateFile(file: File): asserts file is File & { type: UploadedAsset["mimeType"] } {
  if (!MIME_TYPES.has(file.type)) throw new Error(`${file.name} 不是 PNG、JPEG 或 WebP`);
  if (file.size > MAX_BYTES) throw new Error(`${file.name} 超过 10MB`);
}

export async function uploadImage(file: File, purpose: "task" | "avatar" = "task"): Promise<UploadedAsset> {
  validateFile(file);
  const form = new FormData();
  form.set("file", file);
  form.set("purpose", purpose);
  return apiRequest<UploadedAsset>("/api/uploads", {
    method: "POST",
    body: form,
  });
}
