import {
  ImageQuality,
  ImageRatio,
  TaskType,
} from "@prisma/client";
import { hashPassword } from "@better-auth/utils/password";
import { bootstrapAdmin, createPrismaAdminBootstrapStore } from "../src/admin-bootstrap.js";
import { prisma } from "../src/index.js";

const DEFAULT_SETTINGS = [
  { key: "welcomeCredits", value: 10 },
  { key: "checkInMin", value: 1 },
  { key: "checkInMax", value: 5 },
] as const;

const RATIOS = Object.values(ImageRatio);
const QUALITIES = Object.values(ImageQuality);
const TYPES = Object.values(TaskType);
const DEFAULT_ADMIN_EMAIL = "admin@example.com";
const DEFAULT_ADMIN_NAME = "默认管理员";
const MIN_PASSWORD_LENGTH = 8;

function adminPassword(): string {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD 必须配置且不少于 ${MIN_PASSWORD_LENGTH} 位`);
  }
  return password;
}

function priceFor(type: TaskType, quality: ImageQuality): number {
  const base = type === TaskType.GENERATE ? 4 : 6;
  return quality === ImageQuality.HIGH ? base * 2 : base;
}

async function seedSettings(): Promise<void> {
  for (const setting of DEFAULT_SETTINGS) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
}

async function seedPricing(): Promise<void> {
  for (const type of TYPES) {
    for (const ratio of RATIOS) {
      for (const quality of QUALITIES) {
        await prisma.pricingRule.upsert({
          where: { type_ratio_quality: { type, ratio, quality } },
          update: {},
          create: { type, ratio, quality, pointCost: priceFor(type, quality) },
        });
      }
    }
  }
}

async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() || DEFAULT_ADMIN_EMAIL;
  const name = process.env.ADMIN_NAME?.trim() || DEFAULT_ADMIN_NAME;
  await bootstrapAdmin(createPrismaAdminBootstrapStore(prisma), {
    email,
    name,
    createPasswordHash: () => hashPassword(adminPassword()),
  });
}

async function main(): Promise<void> {
  await seedSettings();
  await seedPricing();
  await seedAdmin();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
