"use client";

import { History, LoaderCircle, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, type TaskView } from "@/lib/client-api";

const STATUS_TONE = { QUEUED: "warning", RUNNING: "primary", SUCCEEDED: "success", FAILED: "error", CANCELLED: "neutral" } as const;
const STATUS_LABEL = { QUEUED: "排队中", RUNNING: "处理中", SUCCEEDED: "已完成", FAILED: "失败", CANCELLED: "已取消" } as const;

function HistorySkeleton() {
  return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="overflow-hidden rounded-lg border border-border bg-card"><Skeleton className="aspect-square rounded-none" /><div className="grid gap-3 p-4"><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div></div>)}</div>;
}

function EmptyHistory() {
  return <div className="workspace-index-surface workspace-empty"><History className="size-8 text-muted-foreground" /><div><p className="font-semibold">最近七天还没有创作记录</p><p className="mt-2 text-sm text-muted-foreground">创建第一个任务后，状态与结果会出现在这里。</p></div><Link href="/generate" className={buttonVariants()}>创建图片</Link></div>;
}

function HistoryCard({ task }: { task: TaskView }) {
  const result = task.assets.find((asset) => asset.role === "RESULT");
  return (
    <article className="workspace-history-item"><div className="workspace-history-item__image">{result ? <Image src={result.url} alt={task.prompt} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">任务尚未生成结果图</div>}</div><div className="workspace-history-item__body"><div className="workspace-history-item__meta"><Badge tone={STATUS_TONE[task.status]}>{STATUS_LABEL[task.status]}</Badge><span className="text-xs tabular-nums text-muted-foreground">{task.pointCost} 积分</span></div><p className="workspace-history-item__prompt line-clamp-3">{task.prompt}</p><p className="workspace-history-item__time">{task.type === "GENERATE" ? "文生图" : "多图修图"} · {new Date(task.createdAt).toLocaleString("zh-CN")}</p>{task.errorMessage && <p className="text-xs leading-5 text-destructive">{task.errorMessage}</p>}</div></article>
  );
}

export function HistoryList() {
  const [tasks, setTasks] = useState<TaskView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { setTasks(await apiRequest<TaskView[]>("/api/tasks")); } catch (reason) { setError(reason instanceof Error ? reason.message : "历史记录加载失败，请稍后重试。"); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <div className="workspace-index"><div className="workspace-index__bar workspace-index-surface"><div><p className="workspace-panel__title">最近任务</p><p className="workspace-panel__description">第八天会自动删除输入图与结果图，摘要和积分记录继续保留。</p></div><div className="flex items-center gap-3"><span className="workspace-index__count">{tasks.length} 条记录</span><Button variant="outline" onClick={() => void load()} disabled={loading} data-state={loading ? "loading" : undefined}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}{loading ? "正在刷新" : "刷新"}</Button></div></div>{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}{loading && tasks.length === 0 ? <HistorySkeleton /> : tasks.length === 0 ? <EmptyHistory /> : <div className="workspace-history-grid">{tasks.map((task) => <HistoryCard key={task.id} task={task} />)}</div>}</div>;
}
