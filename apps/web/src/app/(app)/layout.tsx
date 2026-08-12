import type { ReactNode } from "react";
import { createDownloadUrl } from "@image-playground/core";
import { UserRole } from "@image-playground/db";
import { AppNav } from "@/components/app-nav";
import { requireUser } from "@/lib/session";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await requireUser();
  const avatarUrl = session.user.image ? await createDownloadUrl(session.user.image) : null;
  return (
    <div className="workspace-shell">
      <AppNav user={{ name: session.user.name, email: session.user.email, avatarUrl }} isAdmin={session.user.role === UserRole.ADMIN} />
      <main id="main-content" className="workspace-main safe-page-x mx-auto w-full max-w-[1440px]">{children}</main>
    </div>
  );
}
