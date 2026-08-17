import {
  DomainError,
  isObjectOwnedByUser,
  mimeTypeForObjectKey,
  readObjectStream,
} from "@image-playground/core";
import { UserRole } from "@image-playground/db";
import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/session";

interface RouteContext {
  readonly params: Promise<{ key: string[] }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireApiUser();
    const { key } = await context.params;
    const objectKey = key.join("/");
    const isAdmin = session.user.role === UserRole.ADMIN;
    if (!isAdmin && !isObjectOwnedByUser(session.user.id, objectKey)) {
      throw new DomainError("ASSET_FORBIDDEN", "无权访问该图片", 403);
    }
    const { body, length } = await readObjectStream(objectKey);
    return new Response(body, {
      headers: {
        "Content-Type": mimeTypeForObjectKey(objectKey),
        ...(length !== undefined ? { "Content-Length": String(length) } : {}),
        // objectKey 由随机 UUID 组成且内容不可变，替换图片会生成新 key
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
