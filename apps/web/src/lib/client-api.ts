export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, {
    ...init,
    headers,
  });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `请求失败：${response.status}`);
  return body;
}

export interface AssetView {
  id: string;
  role: "PRIMARY" | "REFERENCE" | "RESULT";
  mimeType: string;
  bytes: number;
  url: string;
}

export interface TaskView {
  id: string;
  type: "GENERATE" | "EDIT";
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  prompt: string;
  ratio: "SQUARE" | "LANDSCAPE" | "PORTRAIT";
  quality: "STANDARD" | "HIGH";
  pointCost: number;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
  assets: AssetView[];
}

export interface PricingView {
  id: string;
  type: "GENERATE" | "EDIT";
  ratio: TaskView["ratio"];
  quality: TaskView["quality"];
  pointCost: number;
  active: boolean;
}
