import { describe, expect, it } from "vitest";
import { openSecret, sealSecret } from "../src/secret-box.js";

const ROOT_KEY = "test-root-key-with-more-than-thirty-two-characters";
const OTHER_KEY = "other-root-key-with-more-than-thirty-two-characters";
const SECRET = "provider-secret-value";

describe("服务配置密钥加密", () => {
  it("使用随机 IV 加密并可完整解密", () => {
    const first = sealSecret(SECRET, ROOT_KEY);
    const second = sealSecret(SECRET, ROOT_KEY);
    expect(first).not.toBe(second);
    expect(first).not.toContain(SECRET);
    expect(openSecret(first, ROOT_KEY)).toBe(SECRET);
    expect(openSecret(second, ROOT_KEY)).toBe(SECRET);
  });

  it("使用错误根密钥时明确失败", () => {
    const encrypted = sealSecret(SECRET, ROOT_KEY);
    expect(() => openSecret(encrypted, OTHER_KEY)).toThrow();
  });

  it("密文被篡改时明确失败", () => {
    const encrypted = sealSecret(SECRET, ROOT_KEY);
    const tampered = `${encrypted.slice(0, -1)}A`;
    expect(() => openSecret(tampered, ROOT_KEY)).toThrow();
  });
});
