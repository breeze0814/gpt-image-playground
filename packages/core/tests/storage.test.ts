import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalAssetStorage, S3AssetStorage } from "../src/storage.js";

const PNG_BYTES = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);

describe("本地图片存储", () => {
  let storageRoot: string;
  let storage: LocalAssetStorage;

  beforeEach(async () => {
    storageRoot = await mkdtemp(path.join(tmpdir(), "image-playground-"));
    storage = new LocalAssetStorage(storageRoot);
  });

  afterEach(async () => {
    await rm(storageRoot, { recursive: true });
  });

  it("写入、校验、读取并删除用户图片", async () => {
    const objectKey = "task/user-1/image.png";
    await storage.writeObject(objectKey, PNG_BYTES, "image/png");
    await expect(storage.validateOwnedAsset("user-1", {
      objectKey,
      mimeType: "image/png",
      bytes: PNG_BYTES.byteLength,
    })).resolves.toBeUndefined();
    await expect(storage.readObject(objectKey)).resolves.toEqual(PNG_BYTES);
    await storage.deleteObject(objectKey);
    await expect(storage.readObject(objectKey)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("拒绝路径穿越和伪造的图片内容", async () => {
    await expect(storage.writeObject("../outside.png", PNG_BYTES, "image/png"))
      .rejects.toThrow("文件路径无效");
    await expect(storage.writeObject("task/user-1/fake.png", Buffer.from("not-png"), "image/png"))
      .rejects.toThrow("图片内容与声明格式不一致");
  });

  it("拒绝其他用户引用已上传图片", async () => {
    const objectKey = "task/user-1/image.png";
    await storage.writeObject(objectKey, PNG_BYTES, "image/png");
    await expect(storage.validateOwnedAsset("user-2", {
      objectKey,
      mimeType: "image/png",
      bytes: PNG_BYTES.byteLength,
    })).rejects.toThrow("图片不属于当前用户");
  });
});

describe("S3 图片存储", () => {
  it("写入对象时校验内容并发送标准 S3 请求", async () => {
    const send = vi.fn().mockResolvedValue({});
    const client = { send, destroy: vi.fn() } as unknown as S3Client;
    const storage = new S3AssetStorage({ provider: "S3", region: "test-1", bucket: "images", accessKeyId: "access", secretAccessKey: "secret", forcePathStyle: true }, client);
    await storage.writeObject("results/user-1/image.png", PNG_BYTES, "image/png");
    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect((command as PutObjectCommand).input).toMatchObject({ Bucket: "images", Key: "results/user-1/image.png", ContentType: "image/png" });
  });
});
