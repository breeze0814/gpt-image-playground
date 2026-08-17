"use client";

import { AlertCircle, CheckCircle2, Clock3, Download, LoaderCircle } from "lucide-react";
import Image from "next/image";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { TaskView } from "@/lib/client-api";
import { cn } from "@/lib/utils";

const STATUS = {
  QUEUED: { label: "排队中", tone: "warning" as const, icon: Clock3 },
  RUNNING: { label: "生成中", tone: "primary" as const, icon: LoaderCircle },
  SUCCEEDED: { label: "已完成", tone: "success" as const, icon: CheckCircle2 },
  FAILED: { label: "失败并退款", tone: "error" as const, icon: AlertCircle },
  CANCELLED: { label: "已取消并退款", tone: "neutral" as const, icon: AlertCircle },
};

function PendingResult() {
  return (
    <div className="workspace-canvas workspace-canvas--pending">
      <LoaderCircle aria-hidden="true" className="size-7 animate-spin text-primary" />
      <div><p className="font-semibold text-foreground">任务正在后台处理</p><p className="mt-1 text-sm leading-6">可以离开此页，稍后在历史记录中查看结果。</p></div>
    </div>
  );
}

function ResultImage({ url, prompt }: { url: string; prompt: string }) {
  // prompt 最长可达 32000 字符，alt 文本只保留开头的描述
  const description = prompt.slice(0, 120);
  return (
    <figure className="grid gap-3">
      <div className="workspace-result__image"><Image src={url} alt={description} fill sizes="(max-width: 1024px) 100vw, 48vw" unoptimized className="object-contain" /></div>
      <a href={url} download className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto sm:justify-self-end")}><Download className="size-4" />下载结果</a>
    </figure>
  );
}

export function TaskResult({ task }: { task: TaskView }) {
  const status = STATUS[task.status];
  const result = task.assets.find((asset) => asset.role === "RESULT");
  const Icon = status.icon;
  return (
    <div aria-live="polite" className="workspace-result">
      <div className="workspace-result__header"><h2 className="workspace-result__title">任务结果</h2><Badge tone={status.tone}><Icon aria-hidden="true" className={task.status === "RUNNING" ? "mr-1 size-3 animate-spin" : "mr-1 size-3"} />{status.label}</Badge></div>
      <div className="workspace-result__body">
        {result && <ResultImage url={result.url} prompt={task.prompt} />}
        {task.errorMessage && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>任务未完成</AlertTitle><AlertDescription>{task.errorMessage} 冻结积分已经退回。</AlertDescription></Alert>}
        {!result && !task.errorMessage && <PendingResult />}
      </div>
    </div>
  );
}
