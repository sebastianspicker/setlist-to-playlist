# setlist.fm API

## Import Variants

- **By setlist ID:** `GET https://api.setlist.fm/rest/1.0/setlist/{id}`. ID can be parsed from URLs like `https://www.setlist.fm/setlist/artist/2024/venue-id.html` (segment contains the setlist ID in some cases; check API docs for exact URL-to-ID mapping).
- **By URL:** Parse the setlist ID from the setlist.fm URL, then call the API by ID. Alternatively use setlist.fm's URL-based endpoint if documented.

## Caching / Backoff

- **Caching:** Optional in our proxy. Cache setlist response by ID with a short TTL (e.g. 1 hour) to reduce calls and protect the API key.
- **Rate limits:** setlist.fm enforces rate limits. On 429, implement exponential backoff and return a clear message to the user.
- **API key:** Pass as `x-api-key` (or per setlist.fm docs). Never expose in the client; use the proxy so the key stays server-side.

## TOS

Comply with setlist.fm's API terms of use and attribution requirements.
