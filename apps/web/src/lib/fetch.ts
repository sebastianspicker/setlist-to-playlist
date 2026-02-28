import type { Result } from "@repo/shared";

/** DCI-004: Max response size to avoid DoS from huge JSON (10 MiB). */
const MAX_JSON_RESPONSE_BYTES = 10 * 1024 * 1024;

function extractError(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string") {
    return (data as { error: string }).error;
  }
  return fallback;
}

/**
 * Fetch URL, parse JSON, and return a Result. Handles non-JSON and error bodies.
 * Rejects responses exceeding MAX_JSON_RESPONSE_BYTES when Content-Length is present.
 */
export async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<Result<T, string>> {
  const res = await fetch(url, init);
  const contentLength = res.headers.get("Content-Length");
  if (contentLength !== null) {
    const len = parseInt(contentLength, 10);
    if (!Number.isNaN(len) && len > MAX_JSON_RESPONSE_BYTES) {
      return { ok: false, error: "Response too large." };
    }
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "Invalid response (non-JSON)." };
  }
  if (!res.ok) {
    return { ok: false, error: extractError(data, `Request failed (${res.status})`) };
  }
  if (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string") {
    return { ok: false, error: (data as { error: string }).error };
  }
  return { ok: true, value: data as T };
}
