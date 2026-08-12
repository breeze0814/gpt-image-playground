import { AlertTriangle, Coins, LayoutDashboard, ListChecks, TicketCheck, Users } from "lucide-react";
import { dashboardMetrics } from "@image-playground/core";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const metrics = await dashboardMetrics();
  const cards = [
    { label: "用户总数", value: metrics.users, icon: Users, className: "sm:col-span-2 xl:col-span-1" },
    { label: "任务总数", value: metrics.tasks, icon: ListChecks, className: "" },
    { label: "失败任务", value: metrics.failedTasks, icon: AlertTriangle, className: "" },
    { label: "已兑换码", value: metrics.redeemedCodes, icon: TicketCheck, className: "" },
    { label: "积分净变动", value: metrics.netPoints, icon: Coins, className: "sm:col-span-2 xl:col-span-1" },
  ];
  return <div className="grid gap-8"><PageHeader title="运营仪表盘" description="用户、图像任务与积分活动的实时概览。数据来自当前数据库，不包含推算指标。" icon={LayoutDashboard} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map(({ label, value, icon: Icon, className }) => <Card key={label} className={cn("shadow-none", className)}><CardContent className="flex min-h-36 flex-col justify-between p-5"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-muted-foreground">{label}</p><Icon className="size-5 text-primary" /></div><p className="font-display text-3xl font-bold tabular-nums">{value}</p></CardContent></Card>)}</div></div>;
}
