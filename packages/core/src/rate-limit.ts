import { DomainError, errorMessage } from "./errors";
import { redisConnection } from "./redis";

export interface RateLimitRule {
  readonly limit: number;
  readonly windowSeconds: number;
}

/**
 * 固定窗口计数限流。Redis 不可用时放行（fail-open），
 * 避免基础设施抖动把业务接口整体打挂。
 */
export async function consumeRateLimit(
  scope: string,
  key: string,
  rule: RateLimitRule,
): Promise<void> {
  const redisKey = `ratelimit:${scope}:${key}`;
  try {
    const count = await redisConnection().incr(redisKey);
    if (count === 1) {
      await redisConnection().expire(redisKey, rule.windowSeconds);
    }
    if (count > rule.limit) {
      throw new DomainError("RATE_LIMITED", "请求过于频繁，请稍后再试", 429);
    }
  } catch (error) {
    if (error instanceof DomainError) throw error;
    console.error(JSON.stringify({ event: "rate-limit-unavailable", scope, error: errorMessage(error) }));
  }
}
