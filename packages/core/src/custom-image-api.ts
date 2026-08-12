import { ImageQuality, ImageRatio } from "@image-playground/db";
import { z } from "zod";
import { QUALITY_BY_LEVEL, SIZE_BY_RATIO } from "./constants";
import type { ImageApiConfig } from "./service-config";

export interface GeneratedImage {
  readonly bytes: Buffer;
  readonly mimeType: "image/webp";
  readonly requestId?: string;
}

export interface GenerateImageRequest {
  readonly prompt: string;
  readonly ratio: ImageRatio;
  readonly quality: ImageQuality;
  readonly userId: string;
}

export interface EditImageRequest extends GenerateImageRequest {
  readonly images: ReadonlyArray<{ bytes: Buffer; mimeType: string; filename: string }>;
}

export interface ImageGateway {
  generateImage(request: GenerateImageRequest): Promise<GeneratedImage>;
  editImage(request: EditImageRequest): Promise<GeneratedImage>;
}

const imageResponseSchema = z.object({
  data: z.array(z.object({ b64_json: z.string().min(1) })).min(1),
  request_id: z.string().min(1).optional(),
});

export class ImageApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ImageApiError";
  }
}

function endpoint(baseUrl: string, endpointPath: string): URL {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(endpointPath.replace(/^\/+/, ""), normalizedBase);
}

function authorizationHeaders(apiKey?: string): HeadersInit {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

async function parseResponse(response: Response): Promise<GeneratedImage> {
  if (!response.ok) {
    const detail = await response.text();
    throw new ImageApiError(
      `IMAGE_API_HTTP_${response.status}`,
      `自定义图像 API 请求失败 (${response.status}): ${detail}`,
      response.status,
    );
  }
  const result = imageResponseSchema.parse(await response.json());
  const image = result.data[0];
  if (!image) throw new Error("自定义图像 API 响应未包含图片");
  return {
    bytes: Buffer.from(image.b64_json, "base64"),
    mimeType: "image/webp",
    ...(result.request_id ? { requestId: result.request_id } : {}),
  };
}

function appendEditFields(form: FormData, request: EditImageRequest, config: ImageApiConfig): void {
  form.set("model", config.model);
  form.set("prompt", request.prompt);
  form.set("size", SIZE_BY_RATIO[request.ratio]);
  form.set("quality", QUALITY_BY_LEVEL[request.quality]);
  form.set("output_format", "webp");
  form.set("user", request.userId);
  for (const image of request.images) {
    const content = Uint8Array.from(image.bytes);
    form.append("image", new Blob([content], { type: image.mimeType }), image.filename);
  }
}

export class CustomImageApiGateway implements ImageGateway {
  constructor(private readonly config: ImageApiConfig) {}

  async generateImage(request: GenerateImageRequest): Promise<GeneratedImage> {
    const response = await fetch(endpoint(this.config.baseUrl, this.config.generatePath), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authorizationHeaders(this.config.apiKey) },
      body: JSON.stringify({
        model: this.config.model,
        prompt: request.prompt,
        size: SIZE_BY_RATIO[request.ratio],
        quality: QUALITY_BY_LEVEL[request.quality],
        output_format: "webp",
        user: request.userId,
      }),
    });
    return parseResponse(response);
  }

  async editImage(request: EditImageRequest): Promise<GeneratedImage> {
    const form = new FormData();
    appendEditFields(form, request, this.config);
    const response = await fetch(endpoint(this.config.baseUrl, this.config.editPath), {
      method: "POST",
      headers: authorizationHeaders(this.config.apiKey),
      body: form,
    });
    return parseResponse(response);
  }
}
