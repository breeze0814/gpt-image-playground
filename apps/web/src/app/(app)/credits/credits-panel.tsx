"use client";

import { CheckCircle2, Coins, Gift, LoaderCircle, TicketCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FormField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/client-api";

interface WalletResponse {
  wallet: { balance: number; frozen: number };
  ledgers: Array<{ id: string; type: string; amount: number; reason: string; createdAt: string }>;
  todayCheckIn: { reward: number } | null;
}

function WalletSkeleton() {
  return <div className="grid gap-6"><Skeleton className="h-36 w-full" /><div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-48" /><Skeleton className="h-48" /></div><Skeleton className="h-72" /></div>;
}

function BalanceSummary({ data }: { data: WalletResponse }) {
  return <section className="workspace-balance" aria-label="积分余额"><div className="workspace-balance__metric"><p className="workspace-balance__label">可用积分</p><p className="workspace-balance__value tabular-nums">{data.wallet.balance}</p><Coins className="size-5 text-primary" /></div><div className="workspace-balance__metric"><p className="workspace-balance__label">任务冻结</p><p className="workspace-balance__value tabular-nums">{data.wallet.frozen}</p><LoaderCircle className="size-5 text-muted-foreground" /></div></section>;
}

function LedgerList({ items }: { items: WalletResponse["ledgers"] }) {
  return <section className="workspace-ledger"><div className="workspace-ledger__header"><h2 className="workspace-ledger__title">积分流水</h2><span className="workspace-index__count">{items.length} 条记录</span></div><div className="workspace-ledger__body">{items.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">还没有积分变动记录。</p> : <div>{items.map((item) => <div key={item.id} className="workspace-ledger__entry"><div className="min-w-0"><p className="workspace-ledger__reason">{item.reason}</p><p className="workspace-ledger__time">{new Date(item.createdAt).toLocaleString("zh-CN")}</p></div><span className={item.amount > 0 ? "shrink-0 font-bold tabular-nums text-success" : item.amount < 0 ? "shrink-0 font-bold tabular-nums text-destructive" : "shrink-0 font-bold tabular-nums text-muted-foreground"}>{item.amount > 0 ? "+" : ""}{item.amount}</span></div>)}</div>}</div></section>;
}

export function CreditsPanel() {
  const [data, setData] = useState<WalletResponse | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(() => apiRequest<WalletResponse>("/api/wallet").then(setData), []);
  useEffect(() => { void load().catch((reason: Error) => setError(reason.message)); }, [load]);
  async function action(url: string, body?: object): Promise<void> {
    setLoading(true); setError(""); setMessage("");
    try { const result = await apiRequest<{ reward?: number; points?: number }>(url, { method: "POST", ...(body ? { body: JSON.stringify(body) } : {}) }); setMessage(result.reward ? `签到成功，获得 ${result.reward} 积分。` : `兑换成功，获得 ${result.points} 积分。`); setCode(""); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "操作失败，请检查后重试。"); }
    finally { setLoading(false); }
  }
  if (!data) return error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : <WalletSkeleton />;
  return <div className="grid gap-6"><BalanceSummary data={data} /><div className="workspace-credit-actions"><section className="workspace-credit-action"><h2 className="workspace-credit-action__title"><Gift className="size-5 text-primary" />每日签到</h2>{data.todayCheckIn ? <Alert variant="success"><CheckCircle2 className="size-4" /><AlertDescription>今天已签到，获得 {data.todayCheckIn.reward} 积分。</AlertDescription></Alert> : <Button type="button" onClick={() => void action("/api/check-in")} disabled={loading} className="w-full" data-state={loading ? "loading" : undefined}>{loading && <LoaderCircle className="size-4 animate-spin" />}立即签到</Button>}</section><section className="workspace-credit-action"><h2 className="workspace-credit-action__title"><TicketCheck className="size-5 text-primary" />兑换积分</h2><FormField htmlFor="redeem-code" label="兑换码" description="格式：IMG-XXXXXX-XXXXXX-XXXXXX"><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><Input id="redeem-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="IMG-XXXXXX-XXXXXX-XXXXXX" /><Button type="button" onClick={() => void action("/api/redeem", { code })} disabled={loading || !code.trim()}>兑换积分</Button></div></FormField></section></div>{message && <Alert variant="success"><CheckCircle2 className="size-4" /><AlertDescription>{message}</AlertDescription></Alert>}{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}<LedgerList items={data.ledgers} /></div>;
}
