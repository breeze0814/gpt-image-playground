import { prisma } from "@image-playground/db";
import { IMAGE_RETENTION_DAYS } from "./constants";
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
    for (const task of tasks) {
      await purgeTask(task);
      purged += 1;
    }
  }
}
