# API Reference

All routes are served by the Next.js app (`apps/web`). Base URL is the deployment origin (e.g. `http://localhost:3000` locally).

Every response includes `Content-Type: application/json`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`. CORS is restricted to the configured `ALLOWED_ORIGIN` (or localhost in development).

## Error format

All error responses use a consistent shape:

```json
{ "error": "Human-readable message", "code": "API_ERROR_CODE" }
```

`code` is one of: `UNAUTHORIZED`, `RATE_LIMIT`, `NOT_FOUND`, `BAD_REQUEST`, `INTERNAL`, `SERVICE_UNAVAILABLE`. The `code` field may be omitted for simple validation errors.

---

## GET /api/health

Liveness check for load balancers and deployment monitoring.

**Parameters:** None.

**Rate limit:** None.

**Success (200):**

```json
{ "status": "ok", "timestamp": "2025-06-01T12:00:00.000Z" }
```

**Headers:** Default CORS headers.

**Example:**

```bash
curl -s http://localhost:3000/api/health | jq .
```

---

## GET /api/apple/dev-token

Mint an Apple Developer Token (JWT) for MusicKit JS. The token is signed server-side using `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` from the environment.

**Parameters:** None.

**Rate limit:** 30 requests per 60 s per client IP (in-memory, fixed-window).

**Success (200):**

```json
{ "token": "<jwt>" }
```

**Headers:**

| Header                  | Value      |
| ----------------------- | ---------- |
| `Cache-Control`         | `no-store` |
| `Pragma`                | `no-cache` |
| `X-RateLimit-Remaining` | `<number>` |

**Error responses:**

| Status | Condition                          | Body                                                                                 |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------------ |
| 429    | Rate limit exceeded                | `{ "error": "Too many requests. Please retry shortly.", "code": "RATE_LIMIT" }`      |
| 503    | Missing env vars or signing failed | `{ "error": "...", "code": "SERVICE_UNAVAILABLE" }`                                  |
| 500    | Unexpected error                   | `{ "error": "An unexpected error occurred. Please try again.", "code": "INTERNAL" }` |

The 429 response includes a `Retry-After` header (seconds).

**Example:**

```bash
curl -s http://localhost:3000/api/apple/dev-token | jq .
```

---

## GET /api/setlist/proxy

Proxy to the setlist.fm API. The `SETLISTFM_API_KEY` stays server-side and is never exposed to the client.

**Query parameters:**

| Name  | Type   | Required | Description                                            |
| ----- | ------ | -------- | ------------------------------------------------------ |
| `id`  | string | \*       | Setlist ID (e.g. `63de4613`) or a full setlist.fm URL. |
| `url` | string | \*       | Alias for `id`. Either `id` or `url` must be provided. |

\* Exactly one of `id` or `url` is required. Max length: 2000 characters.

**Rate limit:** 20 requests per 60 s per client IP (in-memory, fixed-window).

**Success (200):**

Returns the setlist.fm API JSON for the requested setlist. Cached privately for 1 hour.

**Headers:**

| Header          | Value (success)         | Value (error) |
| --------------- | ----------------------- | ------------- |
| `Cache-Control` | `private, max-age=3600` | `no-store`    |

**Error responses:**

| Status | Condition                              | Body                                                                                 |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------------ |
| 400    | Missing `id`/`url` parameter           | `{ "error": "Missing id or url query parameter." }`                                  |
| 400    | Input exceeds 2000 chars               | `{ "error": "Input too long. ...", "code": "BAD_REQUEST" }`                          |
| 400    | Invalid setlist ID or URL format       | `{ "error": "Invalid setlist ID or URL. ...", "code": "BAD_REQUEST" }`               |
| 404    | Setlist not found on setlist.fm        | `{ "error": "...", "code": "NOT_FOUND" }`                                            |
| 429    | Rate limit exceeded (local)            | `{ "error": "Too many requests. Please retry shortly.", "code": "RATE_LIMIT" }`      |
| 429    | Rate limit from upstream setlist.fm    | `{ "error": "...", "code": "RATE_LIMIT" }`                                           |
| 500    | Unexpected server error                | `{ "error": "An unexpected error occurred. Please try again.", "code": "INTERNAL" }` |
| 503    | API key not configured or upstream 5xx | `{ "error": "...", "code": "SERVICE_UNAVAILABLE" }`                                  |

The local 429 response includes a `Retry-After` header (seconds).

**Examples:**

```bash
# By setlist ID
curl -s 'http://localhost:3000/api/setlist/proxy?id=63de4613' | jq .

# By setlist.fm URL
curl -s 'http://localhost:3000/api/setlist/proxy?url=https://www.setlist.fm/setlist/radiohead/2017/...' | jq .
```

---

## CORS preflight (OPTIONS)

All routes respond to `OPTIONS` with `204 No Content` and the appropriate `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods: GET, OPTIONS`, and `Access-Control-Allow-Headers: Content-Type` headers (when the origin is allowed).
