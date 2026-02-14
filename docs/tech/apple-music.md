# Apple Music Integration

## Token Strategy

- **Developer Token (JWT):** Issued by our backend. Signed with Apple private key (ES256); claims: `iss` = Team ID, `iat`, `exp` (e.g. 1 hour). Never logged or exposed in repo. Client fetches it from our API when initializing MusicKit.
- **User Token:** Obtained in the browser via MusicKit after user authorizes. Used for playlist create and catalog search on behalf of the user. We do not store or transmit it to our servers.

## Endpoints (our side)

- `GET /apple/dev-token` (or equivalent): Returns `{ token: "…" }` or `{ error: "…" }`. CORS restricted to our frontend origin.

## MusicKit Usage (client)

```text
1. Fetch Developer Token from our API.
2. MusicKit.configure({ app: { name, build }, developerToken: token }).
3. MusicKit.authorize() when user clicks "Create playlist" (or earlier).
4. Catalog search: MusicKit.music.api.music('/v1/catalog/{storefront}/search', { term: query }).
5. Create playlist: MusicKit.music.api.music('/v1/me/library/playlists', { method: 'POST', data: { attributes: { name } } }).
6. Add tracks: MusicKit.music.api.music('/v1/me/library/playlists/{id}/tracks', { method: 'POST', data: { data: [{ id, type: 'songs' }] } }).
```

## Security Notes

- Developer Token must be generated server-side only. Restrict dev-token endpoint by origin and optionally rate-limit.
- User token is in the client only; our API never sees it.
