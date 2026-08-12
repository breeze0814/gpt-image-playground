import { ImageQuality, ImageRatio, TaskType } from "@image-playground/db";
import { describe, expect, it } from "vitest";
import {
  MAX_REFERENCE_IMAGES,
  QUALITY_BY_LEVEL,
  SIZE_BY_RATIO,
  createTaskSchema,
  hashRedemptionCode,
  shanghaiDateKey,
} from "../src/index.js";

describe("图像领域约束", () => {
  it("把产品比例映射为自定义 API 分辨率", () => {
    expect(SIZE_BY_RATIO[ImageRatio.SQUARE]).toBe("1024x1024");
    expect(SIZE_BY_RATIO[ImageRatio.LANDSCAPE]).toBe("1536x864");
    expect(SIZE_BY_RATIO[ImageRatio.PORTRAIT]).toBe("864x1536");
  });

  it("把标准质量显式映射为 API medium", () => {
    expect(QUALITY_BY_LEVEL[ImageQuality.STANDARD]).toBe("medium");
    expect(QUALITY_BY_LEVEL[ImageQuality.HIGH]).toBe("high");
  });

  it("拒绝超过三张参考图", () => {
    const asset = { objectKey: "task/user/a.png", mimeType: "image/png", bytes: 100 };
    const result = createTaskSchema.safeParse({
      type: TaskType.EDIT,
      prompt: "修改背景",
      ratio: ImageRatio.SQUARE,
      quality: ImageQuality.STANDARD,
      idempotencyKey: crypto.randomUUID(),
      primary: asset,
      references: Array.from({ length: MAX_REFERENCE_IMAGES + 1 }, (_, index) => ({
        ...asset,
        objectKey: `task/user/${index}.png`,
      })),
    });
    expect(result.success).toBe(false);
  });
});

describe("活动规则", () => {
  it("兑换码哈希忽略大小写与空格", () => {
    expect(hashRedemptionCode(" img-abc-123 ")).toBe(hashRedemptionCode("IMG-ABC-123"));
  });

  it("签到日期按上海时区计算", () => {
    expect(shanghaiDateKey(new Date("2026-07-14T16:30:00.000Z"))).toBe("2026-07-15");
  });
});
