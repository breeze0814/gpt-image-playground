"use client";

import { ImagePlus, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FormField } from "@/components/form-field";
import { TaskOptions } from "@/components/task-options";
import { TaskResult } from "@/components/task-result";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTaskPolling } from "@/hooks/use-task-polling";
import { apiRequest, type PricingView, type TaskView } from "@/lib/client-api";
import { cn } from "@/lib/utils";

const MAX_PROMPT_LENGTH = 32_000;

function EmptyResult() {
  return (
    <div className="workspace-result">
      <div className="workspace-result__header"><div><h2 className="workspace-result__title">输出画布</h2><p className="workspace-panel__description">提交后，生成中的任务会固定显示在这里。</p></div><span className="workspace-index__count">等待输入</span></div>
      <div className="workspace-result__body"><div className="workspace-canvas"><div className="workspace-canvas__empty"><span className="workspace-canvas__icon"><ImagePlus className="size-5" /></span><div><p className="workspace-canvas__title">结果会显示在这里</p><p className="workspace-canvas__copy">任务异步执行。离开页面不会中断处理，完成后可从历史记录继续查看。</p></div></div></div></div>
    </div>
  );
}

interface GenerateControlsProps {
  prompt: string;
  ratio: TaskView["ratio"];
  quality: TaskView["quality"];
  pointCost: number | undefined;
  loading: boolean;
  error: string;
  onPromptChange: (value: string) => void;
  onRatioChange: (value: TaskView["ratio"]) => void;
  onQualityChange: (value: TaskView["quality"]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

function GenerateControls(props: GenerateControlsProps) {
  const { prompt, ratio, quality, pointCost, loading, error, onPromptChange, onRatioChange, onQualityChange, onSubmit } = props;
  return (
    <div className="workspace-panel">
      <div className="workspace-panel__header"><div><h2 className="workspace-panel__title">创作描述</h2><p className="workspace-panel__description">先写主体，再补充环境、镜头、材质和光线。</p></div><span className="workspace-index__count">文生图</span></div>
      <div className="workspace-panel__body"><form onSubmit={onSubmit} className="grid gap-5"><FormField htmlFor="generate-prompt" label="提示词" description={`${prompt.length.toLocaleString("zh-CN")} / ${MAX_PROMPT_LENGTH.toLocaleString("zh-CN")} 字符`} required><div className="workspace-prompt"><Textarea id="generate-prompt" required maxLength={MAX_PROMPT_LENGTH} value={prompt} onChange={(event) => onPromptChange(event.target.value)} placeholder="写下主体、环境、镜头和质感。" aria-describedby="generate-prompt-message" /></div></FormField><TaskOptions idPrefix="generate" ratio={ratio} quality={quality} onRatioChange={onRatioChange} onQualityChange={onQualityChange} />{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}<div className="workspace-submit"><span className="workspace-submit__cost">{pointCost === undefined ? "正在读取本次任务成本" : `本次任务 · ${pointCost} 积分`}</span><Button type="submit" disabled={loading || !prompt.trim() || pointCost === undefined} className="w-full" data-state={loading ? "loading" : error ? "error" : undefined}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{loading ? "正在创建任务" : pointCost === undefined ? "正在读取价格" : "生成图片"}</Button></div></form></div>
    </div>
  );
}

export function GenerateForm() {
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState<TaskView["ratio"]>("SQUARE");
  const [quality, setQuality] = useState<TaskView["quality"]>("STANDARD");
  const [pricing, setPricing] = useState<PricingView[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const polled = useTaskPolling(taskId);
  useEffect(() => { void apiRequest<PricingView[]>("/api/pricing").then(setPricing).catch((reason: Error) => setError(reason.message)); }, []);
  const pointCost = useMemo(() => pricing.find((rule) => rule.type === "GENERATE" && rule.ratio === ratio && rule.quality === quality)?.pointCost, [pricing, ratio, quality]);
  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); setLoading(true); setError("");
    try { const task = await apiRequest<{ id: string }>("/api/tasks", { method: "POST", body: JSON.stringify({ type: "GENERATE", prompt, ratio, quality, idempotencyKey: crypto.randomUUID() }) }); setTaskId(task.id); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "任务创建失败，请检查输入后重试。"); }
    finally { setLoading(false); }
  }
  return <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><div className={cn("min-w-0", polled.task && "order-2 xl:order-1")}><GenerateControls prompt={prompt} ratio={ratio} quality={quality} pointCost={pointCost} loading={loading} error={error} onPromptChange={setPrompt} onRatioChange={setRatio} onQualityChange={setQuality} onSubmit={(event) => void submit(event)} /></div><div className={cn("min-w-0", polled.task && "order-1 xl:order-2")}>{polled.task ? <TaskResult task={polled.task} /> : <EmptyResult />}</div></div>;
}
