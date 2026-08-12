import { UserRole, UserStatus } from "@image-playground/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";
import { DomainError } from "@image-playground/core";

export async function currentSession() {
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
}

export async function requireUser() {
  const session = await currentSession();
  if (!session) redirect("/login");
  const user = session.user as typeof session.user & {
    role: UserRole;
    status: UserStatus;
  };
  if (user.status !== UserStatus.ACTIVE) redirect("/login?error=disabled");
  return { ...session, user };
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.user.role !== UserRole.ADMIN) redirect("/generate");
  return session;
}

export async function requireApiUser() {
  const session = await currentSession();
  if (!session) throw new DomainError("UNAUTHORIZED", "请先登录", 401);
  const user = session.user as typeof session.user & {
    role: UserRole;
    status: UserStatus;
  };
  if (user.status !== UserStatus.ACTIVE) throw new DomainError("USER_DISABLED", "账户不可用", 403);
  return { ...session, user };
}

export async function requireApiAdmin() {
  const session = await requireApiUser();
  if (session.user.role !== UserRole.ADMIN) throw new DomainError("FORBIDDEN", "需要管理员权限", 403);
  return session;
}
