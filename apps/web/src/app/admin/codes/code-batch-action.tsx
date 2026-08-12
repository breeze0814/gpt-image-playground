"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/client-api";

export function CodeBatchAction({ batchId, disabled }: { batchId: string; disabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function toggle(): Promise<void> {
    setLoading(true);
    try {
      await apiRequest("/api/admin/codes", { method: "PATCH", body: JSON.stringify({ batchId, disabled: !disabled }) });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }
  return <Button type="button" size="sm" variant="outline" disabled={loading} data-state={loading ? "loading" : undefined} onClick={() => void toggle()}>{loading ? "正在更新" : disabled ? "重新启用" : "停用批次"}</Button>;
}
