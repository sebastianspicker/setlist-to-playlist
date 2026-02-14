# MVP Scope

## In Scope

- **One URL in:** User enters a setlist.fm URL or setlist ID.
- **Preview:** Show artist, venue, date, and ordered list of tracks.
- **Matching:** For each track, suggest an Apple Music match (search by track + artist); user can confirm or manually correct/search.
- **Create playlist:** On confirmation, create an Apple Music playlist in the user's account and add the selected tracks in order.

## Out of Scope (for MVP)

- Multiple setlists in one session, merge setlists, or batch import.
- Persisting setlists or playlists on our side; no user accounts on our platform.
- Offline creation of playlists (export requires network and Apple Music auth).

## Risks

- setlist.fm rate limits and API availability.
- Apple Music catalog coverage (some live or rare tracks may not match).
- User revokes MusicKit authorization; we need clear re-auth flow.

## Success

- User can complete the flow (import → preview → match → export) for a typical setlist in under a few minutes.
- No secrets (API keys, Apple private key) exposed to the client.
