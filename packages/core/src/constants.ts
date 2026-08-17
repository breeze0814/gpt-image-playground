import { ImageQuality, ImageRatio } from "@image-playground/db";

export const IMAGE_QUEUE_NAME = "image-tasks";
export const CLEANUP_QUEUE_NAME = "asset-cleanup";
export const IMAGE_RETENTION_DAYS = 7;
export const TASK_RUNNING_TIMEOUT_MS = 15 * 60 * 1000;
export const TASK_QUEUED_TIMEOUT_MS = 15 * 60 * 1000;
export const TASK_RECOVERY_BATCH_SIZE = 100;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_REFERENCE_IMAGES = 3;
export const HISTORY_PAGE_SIZE = 24;
export const SUPPORTED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const SIZE_BY_RATIO: Readonly<Record<ImageRatio, string>> = {
  [ImageRatio.SQUARE]: "1024x1024",
  [ImageRatio.LANDSCAPE]: "1536x864",
  [ImageRatio.PORTRAIT]: "864x1536",
};

export const QUALITY_BY_LEVEL: Readonly<
  Record<ImageQuality, "medium" | "high">
> = {
  [ImageQuality.STANDARD]: "medium",
  [ImageQuality.HIGH]: "high",
};
