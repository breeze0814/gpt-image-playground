import { listPricing, SETTING_KEYS, updateNumericSettings, updatePricing } from "@image-playground/core";
import { ImageQuality, ImageRatio, TaskType, prisma } from "@image-playground/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { requireApiAdmin } from "@/lib/session";

const MAX_POINTS = 100_000;
const settingsSchema = z.object({
  welcomeCredits: z.number().int().min(0).max(MAX_POINTS),
  checkInMin: z.number().int().min(0).max(MAX_POINTS),
  checkInMax: z.number().int().min(0).max(MAX_POINTS),
  pricing: z.array(z.object({
    type: z.enum(TaskType),
    ratio: z.enum(ImageRatio),
    quality: z.enum(ImageQuality),
    pointCost: z.number().int().positive().max(MAX_POINTS),
  })),
}).refine((value) => value.checkInMax >= value.checkInMin, {
  message: "签到最大值必须大于等于最小值",
});
const BUSINESS_SETTING_KEYS = Object.freeze(Object.values(SETTING_KEYS));

export async function GET() {
  try {
    await requireApiAdmin();
    const [settings, pricing] = await Promise.all([
      prisma.appSetting.findMany({ where: { key: { in: [...BUSINESS_SETTING_KEYS] } } }),
      listPricing(),
    ]);
    return NextResponse.json({ settings, pricing });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireApiAdmin();
    const input = settingsSchema.parse(await request.json());
    await updateNumericSettings({
      welcomeCredits: input.welcomeCredits,
      checkInMin: input.checkInMin,
      checkInMax: input.checkInMax,
    });
    await Promise.all(input.pricing.map(updatePricing));
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
