import { beforeEach, describe, expect, it, vi } from "vitest";

const redisMock = {
  incr: vi.fn(),
  expire: vi.fn(),
};

vi.mock("../src/redis.js", () => ({
  redisConnection: () => redisMock,
}));

import { consumeRateLimit } from "../src/rate-limit.js";

describe("接口限流", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("超过窗口内允许次数时抛出 429", async () => {
    redisMock.incr.mockResolvedValue(6);
    await expect(consumeRateLimit("redeem", "user-1", { limit: 5, windowSeconds: 60 }))
      .rejects.toMatchObject({ code: "RATE_LIMITED", status: 429 });
    expect(redisMock.incr).toHaveBeenCalledWith("ratelimit:redeem:user-1");
  });

  it("首次计数时设置窗口过期时间", async () => {
    redisMock.incr.mockResolvedValue(1);
    await expect(consumeRateLimit("upload", "user-1", { limit: 20, windowSeconds: 60 })).resolves.toBeUndefined();
    expect(redisMock.expire).toHaveBeenCalledWith("ratelimit:upload:user-1", 60);
  });

  it("Redis 不可用时放行", async () => {
    redisMock.incr.mockRejectedValue(new Error("connection refused"));
    await expect(consumeRateLimit("check-in", "user-1", { limit: 5, windowSeconds: 60 })).resolves.toBeUndefined();
  });
});
