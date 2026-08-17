import { deleteObject, DomainError, isObjectOwnedByUser } from "@image-playground/core";
import { ThemePreference, UserStatus, prisma } from "@image-playground/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getAuth } from "@/lib/auth";
import { requireApiUser } from "@/lib/session";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(50),
  theme: z.enum(ThemePreference),
  image: z.string().max(500).nullable().optional(),
});

const deleteSchema = z.object({ otp: z.string().length(6) });

export async function PATCH(request: Request) {
  try {
    const session = await requireApiUser();
    const input = profileSchema.parse(await request.json());
    if (input.image) {
      // 更换头像后旧图会被删除，必须确认 key 属于当前用户且来自头像上传
      if (!isObjectOwnedByUser(session.user.id, input.image) || !input.image.startsWith("avatar/")) {
        throw new DomainError("INVALID_ASSET_OWNER", "头像图片不属于当前用户", 403);
      }
    }
    const previous = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: input.name,
        theme: input.theme,
        ...(input.image !== undefined ? { image: input.image } : {}),
      },
    });
    if (previous.image && previous.image !== user.image) await deleteObject(previous.image);
    return NextResponse.json({ name: user.name, theme: user.theme, image: user.image });
  } catch (error) {
    return apiError(error);
  }
}

async function deleteUserData(userId: string, avatarKey: string | null): Promise<void> {
  const assets = await prisma.taskAsset.findMany({
    where: { task: { userId } },
    select: { objectKey: true },
  });
  await Promise.all([...assets.map((asset) => asset.objectKey), ...(avatarKey ? [avatarKey] : [])].map(deleteObject));
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.taskAsset.deleteMany({ where: { task: { userId } } }),
    prisma.imageTask.updateMany({ where: { userId }, data: { prompt: "[账户已注销]", assetsPurgedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: {
      email: `deleted+${userId}@invalid.local`,
      name: "已注销用户",
      image: null,
      status: UserStatus.DISABLED,
      deletedAt: new Date(),
    } }),
  ]);
}

export async function DELETE(request: Request) {
  try {
    const session = await requireApiUser();
    const { otp } = deleteSchema.parse(await request.json());
    await getAuth().api.checkVerificationOTP({ body: {
      email: session.user.email,
      otp,
      type: "sign-in",
    } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
    await deleteUserData(user.id, user.image);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
