import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminPaginationProps {
  page: number;
  pageSize: number;
  total: number;
}

export function AdminPagination({ page, pageSize, total }: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        第 {page} / {totalPages} 页 · 共 {total.toLocaleString("zh-CN")} 条
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={`?page=${page - 1}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>上一页</Link>
        ) : (
          <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}>上一页</span>
        )}
        {page < totalPages ? (
          <Link href={`?page=${page + 1}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>下一页</Link>
        ) : (
          <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}>下一页</span>
        )}
      </div>
    </div>
  );
}
