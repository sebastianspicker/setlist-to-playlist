# Showtape Product Requirements

## Purpose

Showtape is a network-dependent web application that converts one public
setlist.fm setlist into an Apple Music playlist. The application has no
Showtape account or server-side setlist library.

## User

The user has a setlist.fm URL or ID, an Apple Music subscription, and wants to
review the ordered tracks before creating a playlist.

## Implemented requirements

- Accept one setlist.fm URL or a 4 to 12 character hexadecimal ID.
- Display artist, venue, date, source attribution, and ordered non-tape songs.
- Search Apple Music for suggested matches.
- Allow manual search, replacement, skipping, and bulk suggestion actions.
- Preserve manual corrections when late automatic searches finish.
- Create one Apple Music playlist and add selected tracks in order.
- Optionally remove duplicate Apple Music track IDs before export.
- Resume a definite partial track-add operation for up to 30 minutes.
- Retain up to eight recent inputs and parsed setlist IDs in browser
  `localStorage`.
- Provide `/privacy`, `/terms`, and `/api/health`.

## Excluded scope

- Multiple setlists, merging, or batch processing
- Export services other than Apple Music
- A Showtape account or application database
- Offline operation, a service worker, or background synchronization
- Automatic retry when an external playlist write has an unknown outcome
- A separate demonstration route

## Workflow

1. Import: validate a setlist.fm URL or ID and fetch the setlist.
2. Preview: display the show metadata, source link, and ordered songs.
3. Match: suggest Apple Music tracks and allow corrections or skips.
4. Export: review selected tracks, authorize Apple Music, and create the
   playlist.

At least one selected track is required before export.

## Failure and recovery behavior

- Starting a new import aborts the prior browser request.
- Late import responses cannot replace the active request result.
- Invalid input and not-found responses do not offer an automatic retry.
- Network, upstream, and rate-limit errors may offer a retry.
- A definite add-tracks failure can retain the exact remaining IDs.
- An ambiguous playlist create or add failure requires inspection of the Apple
  Music library before another attempt.

## Data handling

- Server credentials remain in environment variables.
- Successful setlist responses can remain in process memory for one hour.
- Browser import history contains only user input and parsed setlist ID.
- Export recovery state remains in `sessionStorage` for up to 30 minutes.
- The setlist.fm source link is displayed while imported data is shown.

## Verification boundaries

Focused contracts cover parsing, mapping, API behavior, security headers, and
workflow state. Live browser behavior remains a manual product check.

Live setlist credentials, Apple Music authorization, playlist writes, Safari,
VoiceOver, and a deployed environment are outside the automated test boundary.

## Related documentation

- [Architecture](../architecture.md)
- [Interface design](../design/interface.md)
- [Apple Music](../tech/apple-music.md)
- [setlist.fm](../tech/setlistfm.md)
- [Deployment](../tech/deployment.md)
