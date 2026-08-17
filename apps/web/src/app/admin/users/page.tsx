import { Users } from "lucide-react";
import { listAdminUsers } from "@image-playground/core";
import { AdminPagination } from "@/components/admin-pagination";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserActions } from "./user-actions";

interface AdminUsersPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const rawPage = Number.parseInt((await searchParams).page ?? "1", 10);
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
  const { items: users, total, pageSize } = await listAdminUsers(undefined, page);
  return (
    <div className="grid gap-8">
      <PageHeader title="用户管理" description="查看用户状态、余额与任务数量，并执行有记录的人工积分调整。" icon={Users} />
      <div className="hidden md:block">
        <Card className="overflow-hidden shadow-none">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>可用 / 冻结</TableHead>
                <TableHead>任务</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <p className="font-semibold">{user.name}</p>
                    <p className="mt-1 text-muted-foreground">{user.email}</p>
                  </TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Badge tone={user.status === "ACTIVE" ? "success" : "error"}>{user.status === "ACTIVE" ? "正常" : "禁用"}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{user.pointAccount?.balance ?? 0} / {user.pointAccount?.frozen ?? 0}</TableCell>
                  <TableCell className="tabular-nums">{user._count.tasks}</TableCell>
                  <TableCell>{user.createdAt.toLocaleString("zh-CN")}</TableCell>
                  <TableCell><UserActions userId={user.id} status={user.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
      <div className="grid gap-4 md:hidden">
        {users.map((user) => (
          <Card key={user.id} className="shadow-none">
            <CardContent className="grid gap-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{user.name}</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
                <Badge tone={user.status === "ACTIVE" ? "success" : "error"}>{user.status === "ACTIVE" ? "正常" : "禁用"}</Badge>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">余额 / 冻结</dt>
                  <dd className="mt-1 font-semibold tabular-nums">{user.pointAccount?.balance ?? 0} / {user.pointAccount?.frozen ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">任务</dt>
                  <dd className="mt-1 font-semibold tabular-nums">{user._count.tasks}</dd>
                </div>
              </dl>
              <div className="flex justify-end"><UserActions userId={user.id} status={user.status} /></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <AdminPagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}
