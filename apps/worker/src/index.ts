import { Worker } from "bullmq";
import dotenv from "dotenv";
import path from "node:path";
import {
  CLEANUP_QUEUE_NAME,
  IMAGE_QUEUE_NAME,
  cleanupQueue,
  processImageTask,
  purgeExpiredTaskAssets,
  recoverStaleTasks,
  redisConnection,
} from "@image-playground/core";

dotenv.config({ path: path.join(process.cwd(), "../..", ".env"), quiet: true });

function concurrencyFromEnv(): number {
  const parsed = Number.parseInt(process.env.IMAGE_WORKER_CONCURRENCY ?? "2", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}

const CLEANUP_PATTERN = "0 3 * * *";
const TASK_RECOVERY_PATTERN = "*/5 * * * *";

const imageWorker = new Worker(
  IMAGE_QUEUE_NAME,
  async (job) => processImageTask(job.data.taskId as string),
  { connection: redisConnection(), concurrency: concurrencyFromEnv() },
);

const cleanupWorker = new Worker(
  CLEANUP_QUEUE_NAME,
  async (job) => (job.name === "recover-stale-tasks" ? recoverStaleTasks() : purgeExpiredTaskAssets()),
  { connection: redisConnection(), concurrency: 1 },
);

async function scheduleCleanup(): Promise<void> {
  await cleanupQueue().add("purge-expired-assets", {}, {
    jobId: "daily-asset-cleanup",
    repeat: { pattern: CLEANUP_PATTERN, tz: "Asia/Shanghai" },
    removeOnComplete: 30,
    removeOnFail: 30,
  });
  await cleanupQueue().add("recover-stale-tasks", {}, {
    jobId: "task-recovery",
    repeat: { pattern: TASK_RECOVERY_PATTERN, tz: "Asia/Shanghai" },
    removeOnComplete: 500,
    removeOnFail: 30,
  });
}

function logWorkerErrors(): void {
  imageWorker.on("failed", (job, error) => {
    console.error(JSON.stringify({ event: "image-job-failed", jobId: job?.id, error: error.message }));
  });
  cleanupWorker.on("failed", (job, error) => {
    console.error(JSON.stringify({ event: "cleanup-job-failed", jobId: job?.id, error: error.message }));
  });
}

async function shutdown(signal: string): Promise<void> {
  console.info(JSON.stringify({ event: "worker-shutdown", signal }));
  await Promise.all([imageWorker.close(), cleanupWorker.close(), cleanupQueue().close()]);
  await redisConnection().quit();
}

async function main(): Promise<void> {
  await scheduleCleanup();
  logWorkerErrors();
  console.info(JSON.stringify({ event: "worker-ready" }));
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => void shutdown(signal));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
