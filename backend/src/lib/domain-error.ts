export class DomainError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function ensure(condition: unknown, statusCode: number, message: string): asserts condition {
  if (!condition) throw new DomainError(statusCode, message);
}
