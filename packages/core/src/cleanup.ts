import { prisma } from "@image-playground/db";
import { IMAGE_RETENTION_DAYS } from "./constants";
import { errorMessage } from "./errors";
import { deleteObject } from "./storage";
import { subDays } from "./time";

const CLEANUP_BATCH_SIZE = 50;

async function purgeTask(task: {
  id: string;
  assets: ReadonlyArray<{ objectKey: string }>;
}): Promise<void> {
  await Promise.all(task.assets.map((asset) => deleteObject(asset.objectKey)));
  await prisma.$transaction([
    prisma.taskAsset.deleteMany({ where: { taskId: task.id } }),
    prisma.imageTask.update({
      where: { id: task.id },
      data: { assetsPurgedAt: new Date() },
    }),
  ]);
}

async function loadExpiredBatch() {
  return prisma.imageTask.findMany({
    where: {
      createdAt: { lt: subDays(new Date(), IMAGE_RETENTION_DAYS) },
      assetsPurgedAt: null,
      assets: { some: {} },
    },
    include: { assets: { select: { objectKey: true } } },
    orderBy: { createdAt: "asc" },
    take: CLEANUP_BATCH_SIZE,
  });
}

export async function purgeExpiredTaskAssets(): Promise<number> {
  let purged = 0;
  while (true) {
    const tasks = await loadExpiredBatch();
    if (tasks.length === 0) return purged;
    let batchPurged = 0;
    for (const task of tasks) {
      // 单个任务失败不应中断整批清理；失败的任务会在下个周期重试
      try {
        await purgeTask(task);
        purged += 1;
        batchPurged += 1;
      } catch (error) {
        console.error(JSON.stringify({ event: "asset-purge-failed", taskId: task.id, error: errorMessage(error) }));
      }
    }
    // 整批都失败说明是系统性故障（如存储不可用），停止本轮避免空转
    if (batchPurged === 0) return purged;
  }
}
