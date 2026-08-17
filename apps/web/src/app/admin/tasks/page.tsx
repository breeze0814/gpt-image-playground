import { ListChecks } from "lucide-react";
import { listAdminTasks } from "@image-playground/core";
import { AdminPagination } from "@/components/admin-pagination";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_TONE = { QUEUED: "warning", RUNNING: "primary", SUCCEEDED: "success", FAILED: "error", CANCELLED: "neutral" } as const;

interface AdminTasksPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminTasksPage({ searchParams }: AdminTasksPageProps) {
  const rawPage = Number.parseInt((await searchParams).page ?? "1", 10);
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
  const { items: tasks, total, pageSize } = await listAdminTasks(page);
  return (
    <div className="grid gap-8">
      <PageHeader title="任务管理" description="查看最近任务的类型、状态、积分、规格与完整失败原因。" icon={ListChecks} />
      <div className="hidden lg:block">
        <Card className="overflow-hidden shadow-none">
          <Table className="min-w-[1120px]">
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>提示词</TableHead>
                <TableHead>规格</TableHead>
                <TableHead>积分</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>错误</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id} className="align-top">
                  <TableCell>{task.user.email}</TableCell>
                  <TableCell>{task.type === "GENERATE" ? "生图" : "修图"}</TableCell>
                  <TableCell><Badge tone={STATUS_TONE[task.status]}>{task.status}</Badge></TableCell>
                  <TableCell className="max-w-sm"><p className="line-clamp-3 leading-6">{task.prompt}</p></TableCell>
                  <TableCell>{task.ratio}<br />{task.quality}</TableCell>
                  <TableCell className="tabular-nums">{task.pointCost}</TableCell>
                  <TableCell>{task.createdAt.toLocaleString("zh-CN")}</TableCell>
                  <TableCell className="max-w-xs text-destructive">
                    {task.errorCode && <p className="font-semibold">{task.errorCode}</p>}
                    <p className="mt-1 leading-5">{task.errorMessage}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
      <div className="grid gap-4 lg:hidden">
        {tasks.map((task) => (
          <Card key={task.id} className="shadow-none">
            <CardContent className="grid gap-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{task.user.email}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{task.type === "GENERATE" ? "文生图" : "多图修图"} · {task.pointCost} 积分</p>
                </div>
                <Badge tone={STATUS_TONE[task.status]}>{task.status}</Badge>
              </div>
              <p className="line-clamp-4 text-sm leading-6">{task.prompt}</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{task.ratio}</span>
                <span>{task.quality}</span>
                <span>{task.createdAt.toLocaleString("zh-CN")}</span>
              </div>
              {task.errorMessage && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {task.errorCode && <p className="font-semibold">{task.errorCode}</p>}
                  <p className="mt-1">{task.errorMessage}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <AdminPagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}
