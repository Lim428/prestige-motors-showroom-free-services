import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isHttpError } from "@/lib/errors";

export const ok = <T>(data: T, init?: ResponseInit) =>
  NextResponse.json({ data }, init);

export const created = <T>(data: T) =>
  NextResponse.json({ data }, { status: 201 });

export const fail = (message: string, status = 400, headers?: HeadersInit) =>
  NextResponse.json({ error: message }, { status, headers });

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    const message = error.errors[0]?.message ?? "Invalid request payload.";
    return fail(message, 422);
  }

  if (isHttpError(error)) {
    return fail(error.message, error.status, error.headers);
  }

  console.error(error);
  return fail("Something went wrong. Please try again.", 500);
}
