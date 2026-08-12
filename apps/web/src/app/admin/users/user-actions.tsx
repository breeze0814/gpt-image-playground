"use client";

import { LoaderCircle, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest } from "@/lib/client-api";

export function UserActions({ userId, status }: { userId: string; status: "ACTIVE" | "DISABLED" }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function update(body: object): Promise<void> {
    setLoading(true); setError("");
    try { await apiRequest(`/api/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify(body) }); router.refresh(); setAmount(""); setReason(""); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "操作失败，请检查后重试。"); }
    finally { setLoading(false); }
  }
  return <Popover><PopoverTrigger asChild><Button variant="outline" size="sm"><Settings2 className="size-4" />管理</Button></PopoverTrigger><PopoverContent align="end" className="grid w-[min(22rem,calc(100vw-2rem))] gap-4"><div><p className="font-bold">账户操作</p><p className="mt-1 text-sm text-muted-foreground">调整积分需要填写原因，操作会写入流水。</p></div><FormField htmlFor={`amount-${userId}`} label="积分调整值" description="可填写负数"><Input id={`amount-${userId}`} type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></FormField><FormField htmlFor={`reason-${userId}`} label="调整原因" description="至少 2 个字符"><Input id={`reason-${userId}`} value={reason} onChange={(event) => setReason(event.target.value)} /></FormField>{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}<div className="grid gap-2"><Button type="button" variant="outline" disabled={loading || !amount || reason.length < 2} onClick={() => void update({ action: "points", amount: Number(amount), reason, idempotencyKey: crypto.randomUUID() })}>{loading && <LoaderCircle className="size-4 animate-spin" />}调整积分</Button><Button type="button" variant={status === "ACTIVE" ? "destructive" : "secondary"} disabled={loading} onClick={() => void update({ action: "status", status: status === "ACTIVE" ? "DISABLED" : "ACTIVE" })}>{status === "ACTIVE" ? "禁用账户" : "恢复账户"}</Button></div></PopoverContent></Popover>;
}
