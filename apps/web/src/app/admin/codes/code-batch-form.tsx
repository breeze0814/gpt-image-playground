"use client";

import { Download, LoaderCircle, TicketCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/client-api";

const MAX_BATCH_SIZE = 10_000;

function downloadCodes(name: string, codes: string[]): void {
  const blob = new Blob([`code\n${codes.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = `${name}-codes.csv`; anchor.click(); URL.revokeObjectURL(url);
}

export function CodeBatchForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [points, setPoints] = useState("10");
  const [quantity, setQuantity] = useState("100");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); setLoading(true); setError("");
    try { const result = await apiRequest<{ codes: string[] }>("/api/admin/codes", { method: "POST", body: JSON.stringify({ name, pointValue: Number(points), quantity: Number(quantity), expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null }) }); downloadCodes(name, result.codes); setName(""); router.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "批次创建失败，请检查后重试。"); }
    finally { setLoading(false); }
  }
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><TicketCheck className="size-5 text-primary" />生成新批次</CardTitle><CardDescription>兑换码明文只会在生成后下载一次。</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 lg:grid-cols-4"><FormField htmlFor="batch-name" label="批次名称" required><Input id="batch-name" value={name} onChange={(event) => setName(event.target.value)} required /></FormField><FormField htmlFor="batch-points" label="每码积分" required><Input id="batch-points" type="number" min="1" value={points} onChange={(event) => setPoints(event.target.value)} required /></FormField><FormField htmlFor="batch-quantity" label="生成数量" description={`最多 ${MAX_BATCH_SIZE.toLocaleString("zh-CN")} 个`} required><Input id="batch-quantity" type="number" min="1" max={MAX_BATCH_SIZE} value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></FormField><FormField htmlFor="batch-expires" label="过期时间" description="留空表示永久有效"><Input id="batch-expires" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></FormField><div className="lg:col-span-4">{error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}<Button type="submit" disabled={loading} data-state={loading ? "loading" : error ? "error" : undefined}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}{loading ? "正在生成" : "生成并下载 CSV"}</Button></div></form></CardContent></Card>;
}
