import { ImageQuality, ImageRatio, TaskType } from "@image-playground/db";
import { z } from "zod";
import { MAX_REFERENCE_IMAGES, MAX_UPLOAD_BYTES, SUPPORTED_MIME_TYPES } from "./constants";

export const imageRatioSchema = z.enum(ImageRatio);
export const imageQualitySchema = z.enum(ImageQuality);

export const uploadRequestSchema = z.object({
  mimeType: z.enum(SUPPORTED_MIME_TYPES),
  bytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  purpose: z.enum(["task", "avatar"]).default("task"),
});

export const assetInputSchema = z.object({
  objectKey: z.string().min(1).max(500),
  mimeType: z.enum(SUPPORTED_MIME_TYPES),
  bytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

const commonTaskSchema = z.object({
  prompt: z.string().trim().min(1).max(32_000),
  ratio: imageRatioSchema,
  quality: imageQualitySchema,
  idempotencyKey: z.string().uuid(),
});

export const generateTaskSchema = commonTaskSchema.extend({
  type: z.literal(TaskType.GENERATE),
});

export const editTaskSchema = commonTaskSchema.extend({
  type: z.literal(TaskType.EDIT),
  primary: assetInputSchema,
  references: z.array(assetInputSchema).max(MAX_REFERENCE_IMAGES).default([]),
});

export const createTaskSchema = z.discriminatedUnion("type", [
  generateTaskSchema,
  editTaskSchema,
]);

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type AssetInput = z.infer<typeof assetInputSchema>;
