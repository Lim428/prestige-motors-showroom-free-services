"use client";

type ApiEnvelope<T> = {
  data?: T;
  error?: string;
};

export class AdminRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminRequestError";
  }
}

export async function adminFetch<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  fallbackMessage: string
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(input, init);
  } catch {
    throw new AdminRequestError(
      "The request could not reach the server. Check your connection and try again."
    );
  }

  let result: ApiEnvelope<T> | null = null;

  try {
    result = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // A proxy or an expired deployment can return HTML instead of the API envelope.
  }

  if (response.status === 401 || response.status === 403) {
    const callbackUrl = `${window.location.pathname}${window.location.search}`;
    window.location.assign(
      `/admin/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    );
    throw new AdminRequestError("Your session expired. Redirecting to sign in.");
  }

  if (!response.ok) {
    throw new AdminRequestError(result?.error ?? fallbackMessage);
  }

  if (typeof result?.data === "undefined") {
    throw new AdminRequestError(fallbackMessage);
  }

  return result.data;
}
