export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly headers?: HeadersInit
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const isHttpError = (error: unknown): error is HttpError =>
  error instanceof HttpError;
