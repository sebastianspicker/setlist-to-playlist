import { handleDevToken } from "api";
import { NextRequest, NextResponse } from "next/server";
import { corsHeadersForOptions } from "@/lib/cors";
import { jsonResponse } from "@/lib/api-response";

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeadersForOptions(request) });
}

export async function GET(request: NextRequest) {
  try {
    const result = await handleDevToken();
    const status = "error" in result ? 503 : 200;
    return jsonResponse(result, status, request, {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    });
  } catch {
    return jsonResponse(
      { error: "An unexpected error occurred. Please try again." },
      500,
      request
    );
  }
}
