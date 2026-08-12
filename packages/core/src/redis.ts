import IORedis from "ioredis";
import { platformEnvironment } from "./env";

let connection: IORedis | undefined;

export function redisConnection(): IORedis {
  connection ??= new IORedis(platformEnvironment().REDIS_URL, {
    maxRetriesPerRequest: null,
  });
  return connection;
}
