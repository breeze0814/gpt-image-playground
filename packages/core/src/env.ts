import { z } from "zod";
import dotenv from "dotenv";
import path from "node:path";

const ENV_CANDIDATES = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
  path.resolve(process.cwd(), "../../.env"),
];

let environmentDirectory = process.cwd();
for (const envPath of ENV_CANDIDATES) {
  const result = dotenv.config({ path: envPath, quiet: true });
  if (!result.error) {
    environmentDirectory = path.dirname(envPath);
    break;
  }
}

const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
});

export type PlatformEnvironment = z.infer<typeof environmentSchema>;

let cachedEnvironment: PlatformEnvironment | undefined;

export function platformEnvironment(): PlatformEnvironment {
  cachedEnvironment ??= environmentSchema.parse(process.env);
  return cachedEnvironment;
}

export function resolveProjectPath(configuredPath: string): string {
  return path.isAbsolute(configuredPath)
    ? path.normalize(configuredPath)
    : path.resolve(environmentDirectory, configuredPath);
}
