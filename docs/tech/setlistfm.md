# setlist.fm API

## Base URL and API key

- **Base URL:** `https://api.setlist.fm/rest/1.0`
- **Authentication:** Pass your API key in the request header: `x-api-key: <your-api-key>` (or `Authorization: Bearer <key>` if setlist.fm documents it; current convention is `x-api-key`).

## Obtaining an API key

1. Create an account at [setlist.fm](https://www.setlist.fm/).
2. Open [setlist.fm API applications](https://www.setlist.fm/settings/apps) and create an application.
3. Copy the API key and set it in your environment as `SETLISTFM_API_KEY`. Never expose this key in the client; use the API proxy so the key stays server-side.

Reference: [setlist.fm API documentation](https://api.setlist.fm/docs/1.0/index.html).

## Import Variants

- **By setlist ID:** `GET https://api.setlist.fm/rest/1.0/setlist/{id}`. ID can be parsed from URLs like `https://www.setlist.fm/setlist/artist/2024/venue-id.html` (segment contains the setlist ID in some cases; check API docs for exact URL-to-ID mapping).
- **By URL:** Parse the setlist ID from the setlist.fm URL, then call the API by ID. Alternatively use setlist.fm's URL-based endpoint if documented.

## Caching / Backoff

- **Caching:** Optional in our proxy. Cache setlist response by ID with a short TTL (e.g. 1 hour) to reduce calls and protect the API key.
- **Rate limits:** setlist.fm enforces rate limits. On 429, implement exponential backoff and return a clear message to the user.
- **API key:** Pass as `x-api-key` (or per setlist.fm docs). Never expose in the client; use the proxy so the key stays server-side.

## Test setlist ID (for manual or integration checks)

A known public setlist you can use to verify the proxy:

- **ID:** `63de4613`
- **Description:** The Beatles at Hollywood Bowl, 1964 (example from setlist.fm API docs)
- **Expected shape:** JSON with `artist`, `venue`, `set` (array of sets with `song` array), `eventDate`, `id`, `versionId`, `url` (attribution).

Example: `GET /api/setlist/proxy?id=63de4613` returns the setlist JSON when `SETLISTFM_API_KEY` is set.

## TOS

Comply with setlist.fm's API terms of use and attribution requirements.
