import { NextRequest, NextResponse } from "next/server";
import { API_ERROR, type ApiErrorPayload } from "@repo/shared";
import { corsHeadersForOptions } from "@/lib/cors";
import { jsonResponse } from "@/lib/api-response";

export function optionsNoContent(request: NextRequest): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeadersForOptions(request),
  });
}

export function internalError(
  request: NextRequest,
  message = "An unexpected error occurred. Please try again."
): NextResponse {
  const payload: ApiErrorPayload = { error: message, code: API_ERROR.INTERNAL };
  return jsonResponse(payload, 500, request);
}
