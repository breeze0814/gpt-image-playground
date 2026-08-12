import {
  serviceConfigUpdateSchema,
  updateServiceConfig,
  type ServiceConfigUpdate,
} from "../src/index.js";

const DEFAULT_LOCAL_PATH = "./storage";
const DEFAULT_GENERATE_PATH = "images/generations";
const DEFAULT_EDIT_PATH = "images/edits";
const DEFAULT_SMTP_PORT = 587;
const SMTP_TLS_PORT = 465;
const LEGACY_SERVICE_KEYS = Object.freeze([
  "LOCAL_STORAGE_PATH", "S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY",
  "S3_SECRET_KEY", "S3_FORCE_PATH_STYLE", "IMAGE_API_BASE_URL", "IMAGE_API_KEY",
  "OPENAI_API_KEY", "IMAGE_API_MODEL", "IMAGE_API_GENERATE_PATH", "IMAGE_API_EDIT_PATH",
  "SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_FROM", "SMTP_USER", "SMTP_PASSWORD",
]);

function environmentValue(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function booleanValue(name: string, fallback: boolean): boolean {
  const value = environmentValue(name).toLowerCase();
  if (!value) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} 必须是 true 或 false`);
}

function portValue(): number {
  const raw = environmentValue("SMTP_PORT");
  if (!raw) return DEFAULT_SMTP_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port)) throw new Error("SMTP_PORT 必须是整数");
  return port;
}

function requireFields(label: string, fields: Readonly<Record<string, string>>): void {
  const missing = Object.entries(fields).filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) throw new Error(`${label} 配置不完整：缺少 ${missing.join("、")}`);
}

function storageInput(): ServiceConfigUpdate["storage"] {
  const region = environmentValue("S3_REGION");
  const bucket = environmentValue("S3_BUCKET");
  const accessKeyId = environmentValue("S3_ACCESS_KEY");
  const secretAccessKey = environmentValue("S3_SECRET_KEY");
  const endpoint = environmentValue("S3_ENDPOINT");
  const usesS3 = Boolean(region || bucket || accessKeyId || secretAccessKey || endpoint);
  if (!usesS3) {
    return { provider: "LOCAL", localPath: environmentValue("LOCAL_STORAGE_PATH") || DEFAULT_LOCAL_PATH, endpoint: "", region: "", bucket: "", accessKeyId: "", secretAccessKey: "", clearSecretAccessKey: false, forcePathStyle: false };
  }
  requireFields("S3", { S3_REGION: region, S3_BUCKET: bucket, S3_ACCESS_KEY: accessKeyId, S3_SECRET_KEY: secretAccessKey });
  return { provider: "S3", localPath: environmentValue("LOCAL_STORAGE_PATH") || DEFAULT_LOCAL_PATH, endpoint, region, bucket, accessKeyId, secretAccessKey, clearSecretAccessKey: false, forcePathStyle: booleanValue("S3_FORCE_PATH_STYLE", false) };
}

function imageApiInput(): ServiceConfigUpdate["imageApi"] {
  const baseUrl = environmentValue("IMAGE_API_BASE_URL");
  const model = environmentValue("IMAGE_API_MODEL");
  const apiKey = environmentValue("IMAGE_API_KEY") || environmentValue("OPENAI_API_KEY");
  const generatePath = environmentValue("IMAGE_API_GENERATE_PATH") || DEFAULT_GENERATE_PATH;
  const editPath = environmentValue("IMAGE_API_EDIT_PATH") || DEFAULT_EDIT_PATH;
  const configured = Boolean(baseUrl || model || apiKey || environmentValue("IMAGE_API_GENERATE_PATH") || environmentValue("IMAGE_API_EDIT_PATH"));
  if (configured) requireFields("图像 API", { IMAGE_API_BASE_URL: baseUrl, IMAGE_API_MODEL: model });
  return { baseUrl, model, generatePath, editPath, apiKey, clearApiKey: false };
}

function emailInput(): ServiceConfigUpdate["email"] {
  const host = environmentValue("SMTP_HOST");
  const from = environmentValue("SMTP_FROM");
  const user = environmentValue("SMTP_USER");
  const password = environmentValue("SMTP_PASSWORD");
  const port = portValue();
  const configured = Boolean(host || from || user || password);
  if (configured) requireFields("邮件", { SMTP_HOST: host, SMTP_FROM: from });
  if (Boolean(user) !== Boolean(password)) throw new Error("SMTP_USER 与 SMTP_PASSWORD 必须同时配置或同时留空");
  return { host, port, secure: booleanValue("SMTP_SECURE", port === SMTP_TLS_PORT), from, user, password, clearPassword: false };
}

async function main(): Promise<void> {
  if (!LEGACY_SERVICE_KEYS.some((name) => environmentValue(name))) {
    throw new Error("未发现可迁移的旧服务环境变量");
  }
  const input = serviceConfigUpdateSchema.parse({
    storage: storageInput(),
    imageApi: imageApiInput(),
    email: emailInput(),
  });
  const view = await updateServiceConfig(input);
  console.log(`服务配置迁移完成：存储=${view.storage.provider}，图像 API=${view.imageApi.ready ? "可用" : "待配置"}，邮件=${view.email.ready ? "可用" : "待配置"}`);
}

await main();
