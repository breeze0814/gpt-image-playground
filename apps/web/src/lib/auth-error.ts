export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== "object" || !error || !("message" in error)) return fallback;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message ? message : fallback;
}
