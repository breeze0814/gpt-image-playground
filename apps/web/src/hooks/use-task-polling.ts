"use client";

import { useEffect, useState } from "react";
import { apiRequest, type TaskView } from "@/lib/client-api";

const ACTIVE_STATUSES = new Set(["QUEUED", "RUNNING"]);
const POLL_INTERVAL_MS = 2_000;

export function useTaskPolling(taskId: string | null) {
  const [task, setTask] = useState<TaskView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!taskId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    async function poll(): Promise<void> {
      try {
        const nextTask = await apiRequest<TaskView>(`/api/tasks/${taskId}`);
        if (cancelled) return;
        setTask(nextTask);
        if (ACTIVE_STATUSES.has(nextTask.status)) timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "任务查询失败");
      }
    }
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [taskId]);

  return { task, error };
}
