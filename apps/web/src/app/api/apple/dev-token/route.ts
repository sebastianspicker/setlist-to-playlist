import { handleDevToken } from "api";
import { NextRequest } from "next/server";
import { API_ERROR, isDevTokenSuccess } from "@repo/shared";
import { jsonResponse } from "@/lib/api-response";
import {
  createInMemoryRateLimiter,
  extractClientKeyFromHeaders,
} from "@/lib/rate-limit";
import { internalError, optionsNoContent } from "../../_helpers";

const DEV_TOKEN_RATE_LIMIT = createInMemoryRateLimiter(30, 60_000);

export async function OPTIONS(request: NextRequest) {
  return optionsNoContent(request);
}

export async function GET(request: NextRequest) {
  const clientKey = extractClientKeyFromHeaders(request.headers);
  const limit = DEV_TOKEN_RATE_LIMIT.take(clientKey);
  if (limit.limited) {
    return jsonResponse(
      { error: "Too many requests. Please retry shortly.", code: API_ERROR.RATE_LIMIT },
      429,
      request,
      { "Retry-After": String(limit.retryAfterSeconds) }
    );
  }

  try {
    const result = await handleDevToken();
    const status = isDevTokenSuccess(result) ? 200 : 503;
    const payload =
      "error" in result
        ? { ...result, code: API_ERROR.SERVICE_UNAVAILABLE }
        : result;
    return jsonResponse(payload, status, request, {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
      "X-RateLimit-Remaining": String(limit.remaining),
    });
  } catch {
    return internalError(request);
  }
}
