import type { AssetRole, ImageTask, TaskAsset } from "@image-playground/db";
import { createDownloadUrl } from "./storage";

type TaskWithAssets = ImageTask & { assets: TaskAsset[] };

export interface TaskAssetView {
  id: string;
  role: AssetRole;
  mimeType: string;
  bytes: number;
  url: string;
}

export async function toTaskView(task: TaskWithAssets) {
  const assets = await Promise.all(task.assets.map(async (asset) => ({
    id: asset.id,
    role: asset.role,
    mimeType: asset.mimeType,
    bytes: asset.bytes,
    url: await createDownloadUrl(asset.objectKey),
  })));
  return {
    id: task.id,
    type: task.type,
    status: task.status,
    prompt: task.prompt,
    ratio: task.ratio,
    quality: task.quality,
    pointCost: task.pointCost,
    errorCode: task.errorCode,
    errorMessage: task.errorMessage,
    createdAt: task.createdAt,
    finishedAt: task.finishedAt,
    assets,
  };
}
