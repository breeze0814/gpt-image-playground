export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "未知错误";
}
