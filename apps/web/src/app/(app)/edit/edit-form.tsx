"use client";

import { FileImage, LoaderCircle, SlidersHorizontal, UploadCloud, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormField } from "@/components/form-field";
import { TaskOptions } from "@/components/task-options";
import { TaskResult } from "@/components/task-result";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTaskPolling } from "@/hooks/use-task-polling";
import { apiRequest, type PricingView, type TaskView } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { uploadImage } from "@/lib/upload-client";

const MAX_REFERENCE_IMAGES = 3;
const BYTES_PER_MEGABYTE = 1024 * 1024;

function FileList({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  return <div className="workspace-file-list">{files.map((file, index) => <div key={`${file.name}-${file.lastModified}`} className="workspace-file"><FileImage className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate">{file.name}</span><span className="text-xs tabular-nums text-muted-foreground">{(file.size / BYTES_PER_MEGABYTE).toFixed(1)} MB</span><Button type="button" variant="ghost" size="icon" aria-label={`移除 ${file.name}`} title={`移除 ${file.name}`} onClick={() => onRemove(index)}><X className="size-4" /></Button></div>)}</div>;
}

function ReferenceUpload({ references, onChange }: { references: File[]; onChange: (files: File[]) => void }) {
  const disabled = references.length >= MAX_REFERENCE_IMAGES;
  function selectFiles(event: React.ChangeEvent<HTMLInputElement>): void {
    const selected = Array.from(event.currentTarget.files ?? []);
    onChange([...references, ...selected].slice(0, MAX_REFERENCE_IMAGES));
    event.currentTarget.value = "";
  }
  return <FormField htmlFor="reference-images" label={`参考图（最多 ${MAX_REFERENCE_IMAGES} 张）`} description={`${references.length} / ${MAX_REFERENCE_IMAGES} 张`}><label htmlFor="reference-images" aria-disabled={disabled} className={cn("workspace-upload", disabled && "workspace-upload--disabled")}><span className="grid justify-items-center gap-2"><UploadCloud className="size-5 text-primary" /><span className="text-sm font-semibold">{disabled ? "参考图已满" : "添加参考图"}</span></span></label><input id="reference-images" type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={disabled} className="sr-only" onChange={selectFiles} /></FormField>;
}

function EmptyEditResult() {
  return <div className="workspace-result"><div className="workspace-result__header"><div><h2 className="workspace-result__title">输出画布</h2><p className="workspace-panel__description">准备好主图和修改指令后，结果会显示在这里。</p></div><span className="workspace-index__count">多图修图</span></div><div className="workspace-result__body"><div className="workspace-canvas"><div className="workspace-canvas__empty"><span className="workspace-canvas__icon"><SlidersHorizontal className="size-5" /></span><div><p className="workspace-canvas__title">修改结果会显示在这里</p><p className="workspace-canvas__copy">上传图片后才会扣除积分。上传或接口错误会在表单中明确显示。</p></div></div></div></div></div>;
}

interface EditControlsProps { primary: File | null; references: File[]; prompt: string; ratio: TaskView["ratio"]; quality: TaskView["quality"]; pointCost: number | undefined; loading: boolean; error: string; onPrimaryChange: (file: File | null) => void; onReferencesChange: (files: File[]) => void; onPromptChange: (value: string) => void; onRatioChange: (value: TaskView["ratio"]) => void; onQualityChange: (value: TaskView["quality"]) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }

function EditControls(props: EditControlsProps) {
  const { primary, references, prompt, ratio, quality, pointCost, loading, error, onPrimaryChange, onReferencesChange, onPromptChange, onRatioChange, onQualityChange, onSubmit } = props;
  return (
    <div className="workspace-panel"><div className="workspace-panel__header"><div><h2 className="workspace-panel__title">素材与修改指令</h2><p className="workspace-panel__description">支持 PNG、JPEG、WebP，单图不超过 10 MB。</p></div><span className="workspace-index__count">输入素材</span></div><div className="workspace-panel__body"><form onSubmit={onSubmit} className="grid gap-5"><FormField htmlFor="primary-image" label="主图" description={primary ? primary.name : "选择需要修改的图片"} required><label htmlFor="primary-image" className="workspace-upload"><span className="grid justify-items-center gap-2"><UploadCloud className="size-5 text-primary" /><span className="text-sm font-semibold">{primary ? "更换主图" : "添加主图"}</span></span></label><input id="primary-image" type="file" accept="image/png,image/jpeg,image/webp" required className="sr-only" onChange={(event) => onPrimaryChange(event.target.files?.[0] ?? null)} /></FormField><ReferenceUpload references={references} onChange={onReferencesChange} /><FileList files={references} onRemove={(index) => onReferencesChange(references.filter((_, itemIndex) => itemIndex !== index))} /><FormField htmlFor="edit-prompt" label="修改指令" description="说明需要保留和需要改变的内容" required><div className="workspace-prompt"><Textarea id="edit-prompt" required maxLength={32_000} value={prompt} onChange={(event) => onPromptChange(event.target.value)} placeholder="写清楚要保留什么，以及要改变什么。" /></div></FormField><TaskOptions idPrefix="edit" ratio={ratio} quality={quality} onRatioChange={onRatioChange} onQualityChange={onQualityChange} />{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}<div className="workspace-submit"><span className="workspace-submit__cost">{pointCost === undefined ? "正在读取本次任务成本" : `本次任务 · ${pointCost} 积分`}</span><Button type="submit" disabled={loading || !primary || !prompt.trim() || pointCost === undefined} className="w-full" data-state={loading ? "loading" : error ? "error" : undefined}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <SlidersHorizontal className="size-4" />}{loading ? "正在上传并创建任务" : pointCost === undefined ? "正在读取价格" : "开始修图"}</Button></div></form></div></div>
  );
}

export function EditForm() {
  const [prompt, setPrompt] = useState("");
  const [primary, setPrimary] = useState<File | null>(null);
  const [references, setReferences] = useState<File[]>([]);
  const [ratio, setRatio] = useState<TaskView["ratio"]>("SQUARE");
  const [quality, setQuality] = useState<TaskView["quality"]>("STANDARD");
  const [pricing, setPricing] = useState<PricingView[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // 网络重试时复用同一个幂等键，避免重复下单扣分；创建成功后换新键
  const idempotencyKeyRef = useRef(crypto.randomUUID());
  const polled = useTaskPolling(taskId);
  useEffect(() => { void apiRequest<PricingView[]>("/api/pricing").then(setPricing).catch((reason: Error) => setError(reason.message)); }, []);
  const pointCost = useMemo(() => pricing.find((rule) => rule.type === "EDIT" && rule.ratio === ratio && rule.quality === quality)?.pointCost, [pricing, ratio, quality]);
  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!primary) { setError("请先选择需要修改的主图。"); return; }
    setLoading(true); setError("");
    try { const [primaryAsset, referenceAssets] = await Promise.all([uploadImage(primary), Promise.all(references.map((file) => uploadImage(file)))]); const task = await apiRequest<{ id: string }>("/api/tasks", { method: "POST", body: JSON.stringify({ type: "EDIT", prompt, ratio, quality, primary: primaryAsset, references: referenceAssets, idempotencyKey: idempotencyKeyRef.current }) }); setTaskId(task.id); idempotencyKeyRef.current = crypto.randomUUID(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "修图任务创建失败，请检查图片后重试。"); }
    finally { setLoading(false); }
  }
  return <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><div className={cn("min-w-0", polled.task && "order-2 xl:order-1")}><EditControls primary={primary} references={references} prompt={prompt} ratio={ratio} quality={quality} pointCost={pointCost} loading={loading} error={error} onPrimaryChange={setPrimary} onReferencesChange={setReferences} onPromptChange={setPrompt} onRatioChange={setRatio} onQualityChange={setQuality} onSubmit={(event) => void submit(event)} /></div><div className={cn("min-w-0", polled.task && "order-1 xl:order-2")}>{polled.task ? <TaskResult task={polled.task} /> : <EmptyEditResult />}</div></div>;
}
