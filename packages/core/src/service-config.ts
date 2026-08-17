import { Prisma, prisma } from "@image-playground/db";
import { z } from "zod";
import { DomainError } from "./errors";
import { platformEnvironment } from "./env";
import { openSecret, sealSecret } from "./secret-box";

const SERVICE_CONFIG_KEY = "serviceConfig";
const DEFAULT_LOCAL_PATH = "./storage";
const DEFAULT_GENERATE_PATH = "images/generations";
const DEFAULT_EDIT_PATH = "images/edits";
const DEFAULT_SMTP_PORT = 587;
const MAX_SECRET_LENGTH = 4096;
const MAX_TEXT_LENGTH = 2048;
const MAX_PORT = 65535;
const INVALID_INPUT_STATUS = 400;
const INTERNAL_CONFIG_STATUS = 500;

const encryptedSecretSchema = z.string().min(1).nullable();
const storedConfigSchema = z.object({
  version: z.literal(1),
  storage: z.object({
    provider: z.enum(["LOCAL", "S3"]),
    localPath: z.string(),
    endpoint: z.string(),
    region: z.string(),
    bucket: z.string(),
    accessKeyId: z.string(),
    secretAccessKey: encryptedSecretSchema,
    forcePathStyle: z.boolean(),
  }),
  imageApi: z.object({
    baseUrl: z.string(),
    model: z.string(),
    generatePath: z.string(),
    editPath: z.string(),
    apiKey: encryptedSecretSchema,
  }),
  email: z.object({
    host: z.string(),
    port: z.number().int().min(1).max(MAX_PORT),
    secure: z.boolean(),
    from: z.string(),
    user: z.string(),
    password: encryptedSecretSchema,
  }),
});

const urlOrEmptySchema = z.union([z.literal(""), z.string().url().max(MAX_TEXT_LENGTH)]);
const textSchema = z.string().trim().max(MAX_TEXT_LENGTH);
const secretSchema = z.string().max(MAX_SECRET_LENGTH);

export const serviceConfigUpdateSchema = z.object({
  storage: z.object({ provider: z.enum(["LOCAL", "S3"]), localPath: textSchema, endpoint: urlOrEmptySchema, region: textSchema, bucket: textSchema, accessKeyId: textSchema, secretAccessKey: secretSchema, clearSecretAccessKey: z.boolean(), forcePathStyle: z.boolean() }),
  imageApi: z.object({ baseUrl: urlOrEmptySchema, model: textSchema, generatePath: textSchema, editPath: textSchema, apiKey: secretSchema, clearApiKey: z.boolean() }),
  email: z.object({ host: textSchema, port: z.number().int().min(1).max(MAX_PORT), secure: z.boolean(), from: textSchema, user: textSchema, password: secretSchema, clearPassword: z.boolean() }),
});

type StoredServiceConfig = z.infer<typeof storedConfigSchema>;
export type ServiceConfigUpdate = z.infer<typeof serviceConfigUpdateSchema>;

export interface ServiceConfigView {
  readonly configured: boolean;
  readonly storage: Omit<StoredServiceConfig["storage"], "secretAccessKey"> & { readonly hasSecretAccessKey: boolean; readonly ready: boolean };
  readonly imageApi: Omit<StoredServiceConfig["imageApi"], "apiKey"> & { readonly hasApiKey: boolean; readonly ready: boolean };
  readonly email: Omit<StoredServiceConfig["email"], "password"> & { readonly hasPassword: boolean; readonly ready: boolean };
}

export type StorageConfig =
  | { readonly provider: "LOCAL"; readonly localPath: string }
  | { readonly provider: "S3"; readonly endpoint?: string; readonly region: string; readonly bucket: string; readonly accessKeyId: string; readonly secretAccessKey: string; readonly forcePathStyle: boolean };

export interface ImageApiConfig { readonly baseUrl: string; readonly apiKey?: string; readonly model: string; readonly generatePath: string; readonly editPath: string }
export interface EmailConfig { readonly host: string; readonly port: number; readonly secure: boolean; readonly from: string; readonly user?: string; readonly password?: string }

const EMPTY_CONFIG: StoredServiceConfig = {
  version: 1,
  storage: { provider: "LOCAL", localPath: DEFAULT_LOCAL_PATH, endpoint: "", region: "", bucket: "", accessKeyId: "", secretAccessKey: null, forcePathStyle: false },
  imageApi: { baseUrl: "", model: "", generatePath: DEFAULT_GENERATE_PATH, editPath: DEFAULT_EDIT_PATH, apiKey: null },
  email: { host: "", port: DEFAULT_SMTP_PORT, secure: false, from: "", user: "", password: null },
};

function invalidConfig(message: string, status = INTERNAL_CONFIG_STATUS): DomainError {
  return new DomainError("INVALID_SERVICE_CONFIG", message, status);
}

async function readStoredConfig(): Promise<StoredServiceConfig | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key: SERVICE_CONFIG_KEY } });
  if (!setting) return null;
  const result = storedConfigSchema.safeParse(setting.value);
  if (!result.success) throw invalidConfig("数据库中的服务配置格式无效");
  return result.data;
}

function secretKey(): string {
  return platformEnvironment().BETTER_AUTH_SECRET;
}

function resolveSecret(current: string | null, replacement: string, clear: boolean): string | null {
  if (clear) return null;
  if (replacement.length === 0) return current;
  return sealSecret(replacement, secretKey());
}

function viewOf(config: StoredServiceConfig, configured: boolean): ServiceConfigView {
  const storageReady = config.storage.provider === "LOCAL"
    ? Boolean(config.storage.localPath)
    : Boolean(config.storage.region && config.storage.bucket && config.storage.accessKeyId && config.storage.secretAccessKey);
  const emailAuthReady = Boolean(config.email.user) === Boolean(config.email.password);
  return {
    configured,
    storage: { provider: config.storage.provider, localPath: config.storage.localPath, endpoint: config.storage.endpoint, region: config.storage.region, bucket: config.storage.bucket, accessKeyId: config.storage.accessKeyId, forcePathStyle: config.storage.forcePathStyle, hasSecretAccessKey: Boolean(config.storage.secretAccessKey), ready: configured && storageReady },
    imageApi: { baseUrl: config.imageApi.baseUrl, model: config.imageApi.model, generatePath: config.imageApi.generatePath, editPath: config.imageApi.editPath, hasApiKey: Boolean(config.imageApi.apiKey), ready: configured && Boolean(config.imageApi.baseUrl && config.imageApi.model && config.imageApi.generatePath && config.imageApi.editPath) },
    email: { host: config.email.host, port: config.email.port, secure: config.email.secure, from: config.email.from, user: config.email.user, hasPassword: Boolean(config.email.password), ready: configured && Boolean(config.email.host && config.email.from && emailAuthReady) },
  };
}

function buildStoredConfig(input: ServiceConfigUpdate, current: StoredServiceConfig): StoredServiceConfig {
  return {
    version: 1,
    storage: { provider: input.storage.provider, localPath: input.storage.localPath, endpoint: input.storage.endpoint, region: input.storage.region, bucket: input.storage.bucket, accessKeyId: input.storage.accessKeyId, forcePathStyle: input.storage.forcePathStyle, secretAccessKey: resolveSecret(current.storage.secretAccessKey, input.storage.secretAccessKey, input.storage.clearSecretAccessKey) },
    imageApi: { baseUrl: input.imageApi.baseUrl, model: input.imageApi.model, generatePath: input.imageApi.generatePath, editPath: input.imageApi.editPath, apiKey: resolveSecret(current.imageApi.apiKey, input.imageApi.apiKey, input.imageApi.clearApiKey) },
    email: { host: input.email.host, port: input.email.port, secure: input.email.secure, from: input.email.from, user: input.email.user, password: resolveSecret(current.email.password, input.email.password, input.email.clearPassword) },
  };
}

function validateActiveStorage(config: StoredServiceConfig["storage"], status = INTERNAL_CONFIG_STATUS): void {
  if (config.provider === "LOCAL" && !config.localPath) throw invalidConfig("本地存储目录不能为空", status);
  if (config.provider === "S3" && (!config.region || !config.bucket || !config.accessKeyId || !config.secretAccessKey)) {
    throw invalidConfig("S3 区域、存储桶和访问密钥必须完整配置", status);
  }
}

export async function getServiceConfigView(): Promise<ServiceConfigView> {
  const config = await readStoredConfig();
  return viewOf(config ?? EMPTY_CONFIG, config !== null);
}

export async function updateServiceConfig(input: ServiceConfigUpdate, actorId?: string): Promise<ServiceConfigView> {
  const current = await readStoredConfig() ?? EMPTY_CONFIG;
  const config = buildStoredConfig(input, current);
  validateActiveStorage(config.storage, INVALID_INPUT_STATUS);
  const secretsUpdated = {
    storageSecret: Boolean(input.storage.secretAccessKey || input.storage.clearSecretAccessKey),
    apiKey: Boolean(input.imageApi.apiKey || input.imageApi.clearApiKey),
    smtpPassword: Boolean(input.email.password || input.email.clearPassword),
  };
  const audit = actorId
    ? prisma.adminAuditLog.create({ data: {
      actorId,
      action: "SERVICE_CONFIG_UPDATED",
      targetType: "AppSetting",
      targetId: SERVICE_CONFIG_KEY,
      details: {
        storageProvider: input.storage.provider,
        imageApiBaseUrl: input.imageApi.baseUrl,
        emailHost: input.email.host,
        secretsUpdated,
      },
    } })
    : null;
  await prisma.$transaction([
    prisma.appSetting.upsert({ where: { key: SERVICE_CONFIG_KEY }, update: { value: config as Prisma.InputJsonValue }, create: { key: SERVICE_CONFIG_KEY, value: config as Prisma.InputJsonValue } }),
    ...(audit ? [audit] : []),
  ]);
  return viewOf(config, true);
}

async function requireStoredConfig(): Promise<StoredServiceConfig> {
  const config = await readStoredConfig();
  if (!config) throw invalidConfig("服务配置尚未在管理后台保存");
  return config;
}

export async function requireStorageConfig(): Promise<StorageConfig> {
  const { storage } = await requireStoredConfig();
  validateActiveStorage(storage);
  if (storage.provider === "LOCAL") return { provider: "LOCAL", localPath: storage.localPath };
  return { provider: "S3", ...(storage.endpoint ? { endpoint: storage.endpoint } : {}), region: storage.region, bucket: storage.bucket, accessKeyId: storage.accessKeyId, secretAccessKey: openSecret(storage.secretAccessKey!, secretKey()), forcePathStyle: storage.forcePathStyle };
}

export async function requireImageApiConfig(): Promise<ImageApiConfig> {
  const { imageApi } = await requireStoredConfig();
  if (!imageApi.baseUrl || !imageApi.model || !imageApi.generatePath || !imageApi.editPath) {
    throw invalidConfig("图像 API 地址、模型或接口路径尚未配置");
  }
  return { baseUrl: imageApi.baseUrl, model: imageApi.model, generatePath: imageApi.generatePath, editPath: imageApi.editPath, ...(imageApi.apiKey ? { apiKey: openSecret(imageApi.apiKey, secretKey()) } : {}) };
}

export async function requireEmailConfig(): Promise<EmailConfig> {
  const { email } = await requireStoredConfig();
  if (!email.host || !email.from) throw invalidConfig("邮件服务器或发件人尚未配置");
  const password = email.password ? openSecret(email.password, secretKey()) : "";
  if (Boolean(email.user) !== Boolean(password)) throw invalidConfig("SMTP 用户名和密码必须同时配置或同时留空");
  return { host: email.host, port: email.port, secure: email.secure, from: email.from, ...(email.user ? { user: email.user, password } : {}) };
}
