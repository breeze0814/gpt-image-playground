import { prisma } from "@image-playground/db";
import { DomainError } from "./errors";

export const SETTING_KEYS = {
  welcomeCredits: "welcomeCredits",
  checkInMin: "checkInMin",
  checkInMax: "checkInMax",
} as const;

export async function getNumericSetting(key: string): Promise<number> {
  const setting = await prisma.appSetting.findUnique({ where: { key } });
  if (typeof setting?.value !== "number") {
    throw new DomainError("INVALID_SETTING", `系统配置 ${key} 不存在或不是数字`, 500);
  }
  return setting.value;
}

export async function updateNumericSettings(
  values: Readonly<Record<string, number>>,
): Promise<void> {
  await prisma.$transaction(Object.entries(values).map(([key, value]) =>
    prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    }),
  ));
}
