import {
  DomainError,
  isObjectOwnedByUser,
  mimeTypeForObjectKey,
  readObject,
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
    const body = await readObject(objectKey);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": mimeTypeForObjectKey(objectKey),
        "Content-Length": String(body.byteLength),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
