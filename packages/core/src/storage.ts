import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DomainError } from "./errors";
import { resolveProjectPath } from "./env";
import type { AssetInput } from "./schemas";
import { requireStorageConfig, type StorageConfig } from "./service-config";

const MIME_BY_EXTENSION = Object.freeze({
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
} as const);

function extensionFor(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/jpeg") return "jpg";
  throw new DomainError("UNSUPPORTED_IMAGE_TYPE", "不支持的图片格式");
}

function objectKeySegments(objectKey: string): readonly string[] {
  const segments = objectKey.split("/");
  const invalid = objectKey.includes("\\")
    || objectKey.startsWith("/")
    || segments.some((segment) => !segment || segment === "." || segment === "..");
  if (invalid) throw new DomainError("INVALID_OBJECT_KEY", "文件路径无效");
  return segments;
}

function hasImageSignature(body: Buffer, mimeType: string): boolean {
  if (mimeType === "image/png") {
    return body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimeType === "image/jpeg") {
    return body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
  }
  return body.subarray(0, 4).toString("ascii") === "RIFF"
    && body.subarray(8, 12).toString("ascii") === "WEBP";
}

export function mimeTypeForObjectKey(objectKey: string): string {
  objectKeySegments(objectKey);
  const extension = path.extname(objectKey).toLowerCase() as keyof typeof MIME_BY_EXTENSION;
  const mimeType = MIME_BY_EXTENSION[extension];
  if (!mimeType) throw new DomainError("UNSUPPORTED_IMAGE_TYPE", "不支持的图片格式");
  return mimeType;
}

export function createObjectKey(
  userId: string,
  mimeType: string,
  purpose: "task" | "avatar",
): string {
  return `${purpose}/${userId}/${randomUUID()}.${extensionFor(mimeType)}`;
}

export function createDownloadUrl(objectKey: string): string {
  return `/api/assets/${objectKeySegments(objectKey).map(encodeURIComponent).join("/")}`;
}

export function isObjectOwnedByUser(userId: string, objectKey: string): boolean {
  const [scope, ownerId] = objectKeySegments(objectKey);
  return ownerId === userId && scope !== undefined
    && ["task", "avatar", "results"].includes(scope);
}

interface AssetStorage {
  validateOwnedAsset(userId: string, asset: AssetInput): Promise<void>;
  readObject(objectKey: string): Promise<Buffer>;
  writeObject(objectKey: string, body: Buffer, mimeType: string): Promise<void>;
  deleteObject(objectKey: string): Promise<void>;
  destroy?(): void;
}

export class LocalAssetStorage {
  constructor(private readonly rootDirectory: string) {}

  private filePath(objectKey: string): string {
    const resolved = path.resolve(this.rootDirectory, ...objectKeySegments(objectKey));
    const relative = path.relative(this.rootDirectory, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new DomainError("INVALID_OBJECT_KEY", "文件路径超出本地存储目录");
    }
    return resolved;
  }

  async validateOwnedAsset(userId: string, asset: AssetInput): Promise<void> {
    if (!isObjectOwnedByUser(userId, asset.objectKey) || !asset.objectKey.startsWith("task/")) {
      throw new DomainError("INVALID_ASSET_OWNER", "图片不属于当前用户", 403);
    }
    const metadata = await stat(this.filePath(asset.objectKey));
    const matches = metadata.size === asset.bytes
      && mimeTypeForObjectKey(asset.objectKey) === asset.mimeType;
    if (!matches) throw new DomainError("ASSET_METADATA_MISMATCH", "上传图片元数据不一致");
  }

  async readObject(objectKey: string): Promise<Buffer> {
    return readFile(this.filePath(objectKey));
  }

  async writeObject(objectKey: string, body: Buffer, mimeType: string): Promise<void> {
    if (mimeTypeForObjectKey(objectKey) !== mimeType || !hasImageSignature(body, mimeType)) {
      throw new DomainError("INVALID_IMAGE_CONTENT", "图片内容与声明格式不一致");
    }
    const target = this.filePath(objectKey);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body, { flag: "wx" });
  }

  async deleteObject(objectKey: string): Promise<void> {
    try {
      await unlink(this.filePath(objectKey));
    } catch (error) {
      // 清理任务重试时对象可能已被删除，ENOENT 视为已删除
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
  }
}

type S3StorageConfig = Extract<StorageConfig, { provider: "S3" }>;

export class S3AssetStorage implements AssetStorage {
  private readonly client: S3Client;

  constructor(private readonly config: S3StorageConfig, client?: S3Client) {
    this.client = client ?? new S3Client({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      forcePathStyle: config.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  async validateOwnedAsset(userId: string, asset: AssetInput): Promise<void> {
    if (!isObjectOwnedByUser(userId, asset.objectKey) || !asset.objectKey.startsWith("task/")) {
      throw new DomainError("INVALID_ASSET_OWNER", "图片不属于当前用户", 403);
    }
    const metadata = await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: asset.objectKey }));
    const matches = metadata.ContentLength === asset.bytes
      && metadata.ContentType === asset.mimeType;
    if (!matches) throw new DomainError("ASSET_METADATA_MISMATCH", "上传图片元数据不一致");
  }

  async readObject(objectKey: string): Promise<Buffer> {
    objectKeySegments(objectKey);
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: objectKey }));
    if (!result.Body) throw new DomainError("ASSET_BODY_MISSING", "对象存储未返回文件内容", 502);
    return Buffer.from(await result.Body.transformToByteArray());
  }

  async writeObject(objectKey: string, body: Buffer, mimeType: string): Promise<void> {
    objectKeySegments(objectKey);
    if (mimeTypeForObjectKey(objectKey) !== mimeType || !hasImageSignature(body, mimeType)) {
      throw new DomainError("INVALID_IMAGE_CONTENT", "图片内容与声明格式不一致");
    }
    await this.client.send(new PutObjectCommand({ Bucket: this.config.bucket, Key: objectKey, Body: body, ContentType: mimeType }));
  }

  async deleteObject(objectKey: string): Promise<void> {
    objectKeySegments(objectKey);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: objectKey }));
  }

  destroy(): void {
    this.client.destroy();
  }
}

async function createStorage(): Promise<AssetStorage> {
  const config = await requireStorageConfig();
  return adapterFor(config);
}

let cachedAdapter: { signature: string; adapter: AssetStorage } | undefined;

function adapterSignature(config: StorageConfig): string {
  return config.provider === "LOCAL"
    ? `local:${resolveProjectPath(config.localPath)}`
    : `s3:${config.endpoint ?? ""}|${config.region}|${config.bucket}|${config.accessKeyId}|${config.secretAccessKey}|${config.forcePathStyle}`;
}

// 复用同一个存储适配器（S3 客户端连接池 / 本地路径），
// 配置变化导致签名变化时惰性替换并销毁旧适配器。
function adapterFor(config: StorageConfig): AssetStorage {
  const signature = adapterSignature(config);
  if (cachedAdapter?.signature === signature) return cachedAdapter.adapter;
  cachedAdapter?.adapter.destroy?.();
  const adapter = config.provider === "LOCAL"
    ? new LocalAssetStorage(resolveProjectPath(config.localPath))
    : new S3AssetStorage(config);
  cachedAdapter = { signature, adapter };
  return adapter;
}

async function withStorage<T>(operation: (adapter: AssetStorage) => Promise<T>): Promise<T> {
  const adapter = await createStorage();
  return operation(adapter);
}

export async function validateOwnedAsset(userId: string, asset: AssetInput): Promise<void> {
  return withStorage((adapter) => adapter.validateOwnedAsset(userId, asset));
}

export async function readObject(objectKey: string): Promise<Buffer> {
  return withStorage((adapter) => adapter.readObject(objectKey));
}

export async function writeObject(objectKey: string, body: Buffer, mimeType: string): Promise<void> {
  return withStorage((adapter) => adapter.writeObject(objectKey, body, mimeType));
}

export async function deleteObject(objectKey: string): Promise<void> {
  return withStorage((adapter) => adapter.deleteObject(objectKey));
}
