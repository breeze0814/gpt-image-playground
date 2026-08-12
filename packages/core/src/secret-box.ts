import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const CONTEXT = "image-playground/service-config/v1";
const IV_BYTES = 12;
const PAYLOAD_VERSION = "v1";

function encryptionKey(keyMaterial: string): Buffer {
  if (keyMaterial.length < 32) throw new Error("服务配置加密根密钥长度不足 32 位");
  return createHmac("sha256", keyMaterial).update(CONTEXT).digest();
}

export function sealSecret(value: string, keyMaterial: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(keyMaterial), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [PAYLOAD_VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function openSecret(payload: string, keyMaterial: string): string {
  const [version, ivValue, tagValue, encryptedValue, extra] = payload.split(".");
  if (version !== PAYLOAD_VERSION || !ivValue || !tagValue || !encryptedValue || extra) {
    throw new Error("服务配置密文格式无效");
  }
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(keyMaterial), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}
