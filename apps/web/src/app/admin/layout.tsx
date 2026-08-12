import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh lg:pl-64">
      <AdminNav />
      <main id="main-content" className="safe-page-x mx-auto w-full max-w-[1600px] py-5 sm:py-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}
