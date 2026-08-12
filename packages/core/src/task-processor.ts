import { AssetRole, TaskType } from "@image-playground/db";
import { randomUUID } from "node:crypto";
import { errorMessage } from "./errors";
import { CustomImageApiGateway, type ImageGateway } from "./custom-image-api";
import { requireImageApiConfig } from "./service-config";
import { readObject, writeObject } from "./storage";
import {
  claimImageTask,
  completeImageTask,
  failImageTask,
  loadImageTask,
} from "./tasks";

function filenameFor(objectKey: string): string {
  return objectKey.split("/").at(-1) ?? `${randomUUID()}.png`;
}

async function loadEditImages(task: Awaited<ReturnType<typeof loadImageTask>>) {
  const inputs = task.assets
    .filter((asset) => asset.role !== AssetRole.RESULT)
    .sort((left, right) => {
      if (left.role === AssetRole.PRIMARY) return -1;
      if (right.role === AssetRole.PRIMARY) return 1;
      return left.createdAt.getTime() - right.createdAt.getTime();
    });
  return Promise.all(inputs.map(async (asset) => ({
    bytes: await readObject(asset.objectKey),
    mimeType: asset.mimeType,
    filename: filenameFor(asset.objectKey),
  })));
}

async function invokeGateway(
  task: Awaited<ReturnType<typeof loadImageTask>>,
  gateway: ImageGateway,
) {
  const request = {
    prompt: task.prompt,
    ratio: task.ratio,
    quality: task.quality,
    userId: task.userId,
  };
  if (task.type === TaskType.GENERATE) return gateway.generateImage(request);
  const images = await loadEditImages(task);
  if (images.length === 0) throw new Error("修图任务缺少输入图片");
  return gateway.editImage({ ...request, images });
}

function providerErrorCode(error: unknown): string {
  if (typeof error === "object" && error && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code) return code.toUpperCase();
  }
  return "IMAGE_PROCESSING_FAILED";
}

export async function processImageTask(
  taskId: string,
  gateway?: ImageGateway,
): Promise<void> {
  const claimed = await claimImageTask(taskId);
  if (!claimed) return;
  try {
    const task = await loadImageTask(taskId);
    const selectedGateway = gateway ?? new CustomImageApiGateway(await requireImageApiConfig());
    const image = await invokeGateway(task, selectedGateway);
    const objectKey = `results/${task.userId}/${task.id}/${randomUUID()}.webp`;
    await writeObject(objectKey, image.bytes, image.mimeType);
    await completeImageTask(taskId, {
      objectKey,
      mimeType: image.mimeType,
      bytes: image.bytes.byteLength,
      ...(image.requestId ? { providerRequestId: image.requestId } : {}),
    });
  } catch (error) {
    await failImageTask(taskId, providerErrorCode(error), errorMessage(error));
    throw error;
  }
}
