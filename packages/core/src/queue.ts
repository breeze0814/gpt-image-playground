import { Queue } from "bullmq";
import { CLEANUP_QUEUE_NAME, IMAGE_QUEUE_NAME } from "./constants";
import { redisConnection } from "./redis";

export interface ImageTaskJob {
  taskId: string;
}

let imageQueueInstance: Queue<ImageTaskJob> | undefined;
let cleanupQueueInstance: Queue | undefined;

export function imageQueue(): Queue<ImageTaskJob> {
  imageQueueInstance ??= new Queue(IMAGE_QUEUE_NAME, {
    connection: redisConnection(),
  });
  return imageQueueInstance;
}

export function cleanupQueue(): Queue {
  cleanupQueueInstance ??= new Queue(CLEANUP_QUEUE_NAME, {
    connection: redisConnection(),
  });
  return cleanupQueueInstance;
}

export async function enqueueImageTask(taskId: string): Promise<void> {
  await imageQueue().add("process-image", { taskId }, {
    jobId: taskId,
    removeOnComplete: 500,
    removeOnFail: 500,
  });
}
