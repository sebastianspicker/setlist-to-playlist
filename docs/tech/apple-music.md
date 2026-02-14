# Apple Music Integration

## Setup (obtaining credentials)

To obtain the Apple Music credentials used for the Developer Token (JWT):

1. **Apple Developer account:** Enroll at [Apple Developer](https://developer.apple.com/programs/) if you don’t have one.
2. **App and Music Kit:** Create an App in [App Store Connect](https://appstoreconnect.apple.com/) and enable **Music Kit** (or use an existing app).
3. **Keys:** In [Certificates, Identifiers & Profiles → Keys](https://developer.apple.com/account/resources/authkeys/list), create a new key and enable **Music Kit**. Download the `.p8` private key once (it cannot be re-downloaded). Note the **Key ID** and your **Team ID** (in the top-right or Membership details).
4. **Environment variables:** Set `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` (contents of the `.p8` file, including the `-----BEGIN/END PRIVATE KEY-----` lines). For the web app, set `NEXT_PUBLIC_APPLE_MUSIC_APP_ID` to your app’s Apple Music app identifier (e.g. from the App’s Services ID or Music Kit configuration).

See [Apple’s Music Kit documentation](https://developer.apple.com/documentation/applemusicapi) and [Configuring Keys for Music Kit](https://developer.apple.com/documentation/applemusicapi/requesting_keys_for_the_apple_music_api) for the official steps.

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
- **Rate limiting:** Not implemented for the dev-token endpoint yet. Consider adding per-IP or per-origin limits (e.g. in API middleware or Vercel/edge config) to reduce abuse and token leakage risk.
- User token is in the client only; our API never sees it.
