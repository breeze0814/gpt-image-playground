"use client";

import { CheckCircle2, LoaderCircle, Save } from "lucide-react";
import { useState } from "react";
import { FormField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { apiRequest, type PricingView } from "@/lib/client-api";
import { IMAGE_RATIO_LABEL } from "@/lib/image-options";

export interface AdminSettings {
  readonly welcomeCredits: number;
  readonly checkInMin: number;
  readonly checkInMax: number;
  readonly pricing: readonly PricingView[];
}

const TYPE_LABEL = { GENERATE: "文生图", EDIT: "多图修图" } as const;
const QUALITY_LABEL = { STANDARD: "标准", HIGH: "高质量" } as const;

function ActivitySettings({ settings, onChange }: { settings: AdminSettings; onChange: (next: AdminSettings) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>活动配置</CardTitle>
        <CardDescription>定义新用户余额与每日签到范围。</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <FormField htmlFor="welcome" label="新用户欢迎积分">
          <Input id="welcome" type="number" min="0" value={settings.welcomeCredits} onChange={(event) => onChange({ ...settings, welcomeCredits: Number(event.target.value) })} />
        </FormField>
        <FormField htmlFor="check-min" label="签到最小积分">
          <Input id="check-min" type="number" min="0" value={settings.checkInMin} onChange={(event) => onChange({ ...settings, checkInMin: Number(event.target.value) })} />
        </FormField>
        <FormField htmlFor="check-max" label="签到最大积分">
          <Input id="check-max" type="number" min="0" value={settings.checkInMax} onChange={(event) => onChange({ ...settings, checkInMax: Number(event.target.value) })} />
        </FormField>
      </CardContent>
    </Card>
  );
}

function PricingSettings({ pricing, onChange }: { pricing: readonly PricingView[]; onChange: (id: string, cost: number) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>任务积分价格</CardTitle>
        <CardDescription>每个任务类型、比例与质量组合单独计价。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-0">
          {pricing.map((rule, index) => (
            <div key={rule.id}>
              {index > 0 && <Separator />}
              <div className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center">
                <div className="min-w-0">
                  <p className="font-semibold">{TYPE_LABEL[rule.type]} · {IMAGE_RATIO_LABEL[rule.ratio]}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{QUALITY_LABEL[rule.quality]}</p>
                </div>
                <FormField htmlFor={`price-${rule.id}`} label="积分">
                  <Input id={`price-${rule.id}`} type="number" min="1" value={rule.pointCost} onChange={(event) => onChange(rule.id, Number(event.target.value))} />
                </FormField>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function payload(settings: AdminSettings) {
  return {
    welcomeCredits: settings.welcomeCredits,
    checkInMin: settings.checkInMin,
    checkInMax: settings.checkInMax,
    pricing: settings.pricing.map(({ type, ratio, quality, pointCost }) => ({ type, ratio, quality, pointCost })),
  };
}

export function AdminSettingsForm({ initial }: { initial: AdminSettings }) {
  const [settings, setSettings] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  function changePrice(id: string, pointCost: number): void {
    setSettings((current) => ({ ...current, pricing: current.pricing.map((rule) => rule.id === id ? { ...rule, pointCost } : rule) }));
  }
  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await apiRequest("/api/admin/settings", { method: "PATCH", body: JSON.stringify(payload(settings)) });
      setMessage("业务规则已保存并开始生效。");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "业务规则未保存，请检查字段后重试。");
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={save} className="grid gap-6">
      <ActivitySettings settings={settings} onChange={setSettings} />
      <PricingSettings pricing={settings.pricing} onChange={changePrice} />
      <div aria-live="polite" className="grid gap-4">
        {message && <Alert variant="success"><CheckCircle2 className="size-4" /><AlertDescription>{message}</AlertDescription></Alert>}
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      </div>
      <Button type="submit" disabled={loading} className="w-full sm:w-auto sm:justify-self-start" data-state={loading ? "loading" : error ? "error" : message ? "success" : undefined}>
        {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
        {loading ? "正在保存" : "保存业务规则"}
      </Button>
    </form>
  );
}
