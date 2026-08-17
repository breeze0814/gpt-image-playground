import { ImageQuality, ImageRatio } from "@image-playground/db";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomImageApiGateway } from "../src/custom-image-api.js";

const IMAGE_BYTES = Buffer.from("custom-image-result");
const CONFIG = Object.freeze({
  baseUrl: "https://images.example.test/v1",
  apiKey: "test-key",
  model: "custom-model",
  generatePath: "generate",
  editPath: "edit",
});

afterEach(() => vi.unstubAllGlobals());

describe("自定义图像 API", () => {
  it("向配置的生成接口发送请求并解析图片", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      data: [{ b64_json: IMAGE_BYTES.toString("base64") }],
      request_id: "request-1",
    }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new CustomImageApiGateway(CONFIG).generateImage({
      prompt: "测试图片",
      ratio: ImageRatio.LANDSCAPE,
      quality: ImageQuality.HIGH,
      userId: "user-1",
    });

    expect(result).toEqual({ bytes: IMAGE_BYTES, mimeType: "image/webp", requestId: "request-1" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://images.example.test/v1/generate");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-key");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "custom-model",
      size: "1536x864",
      quality: "high",
      user: "user-1",
    });
  });

  it("完整暴露非成功响应", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(
      new Response("provider unavailable", { status: 503 }),
    ));
    const gateway = new CustomImageApiGateway(CONFIG);
    await expect(gateway.generateImage({
      prompt: "test",
      ratio: ImageRatio.SQUARE,
      quality: ImageQuality.STANDARD,
      userId: "user-1",
    })).rejects.toMatchObject({ code: "IMAGE_API_HTTP_503", status: 503 });
  });

  it("向编辑接口发送图片表单", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      data: [{ b64_json: IMAGE_BYTES.toString("base64") }],
    }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await new CustomImageApiGateway(CONFIG).editImage({
      prompt: "修改背景",
      ratio: ImageRatio.PORTRAIT,
      quality: ImageQuality.STANDARD,
      userId: "user-1",
      images: [{ bytes: Buffer.from("input"), mimeType: "image/png", filename: "input.png" }],
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://images.example.test/v1/edit");
    const form = init?.body;
    expect(form).toBeInstanceOf(FormData);
    expect((form as FormData).get("model")).toBe("custom-model");
    expect((form as FormData).get("size")).toBe("864x1536");
    expect((form as FormData).getAll("image")).toHaveLength(1);
  });

  it("瞬时网络失败时自动重试一次", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: [{ b64_json: IMAGE_BYTES.toString("base64") }],
      }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new CustomImageApiGateway(CONFIG).generateImage({
      prompt: "retry",
      ratio: ImageRatio.SQUARE,
      quality: ImageQuality.STANDARD,
      userId: "user-1",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.bytes).toEqual(IMAGE_BYTES);
  });

  it("重试耗尽后报超时错误", async () => {
    const timeout = new DOMException("The operation was aborted due to timeout", "TimeoutError");
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(timeout);
    vi.stubGlobal("fetch", fetchMock);

    const gateway = new CustomImageApiGateway(CONFIG);
    await expect(gateway.generateImage({
      prompt: "timeout",
      ratio: ImageRatio.SQUARE,
      quality: ImageQuality.STANDARD,
      userId: "user-1",
    })).rejects.toMatchObject({ code: "IMAGE_API_TIMEOUT", status: 504 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
