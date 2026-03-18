# Data Flow

1. **Import:** Client sends setlist URL or ID to our API proxy (`GET /api/setlist/proxy`). The proxy validates the ID, adds the setlist.fm API key server-side, and forwards to setlist.fm. Response: setlist JSON (artist, venue, date, sets of tracks). Client stores in memory.
2. **Matching:** For each track, client uses normalized name + artist to call Apple Music catalog search (MusicKit) with Developer Token from our API. Results shown; user can pick or search again.
3. **Export:** Client calls MusicKit to create playlist and add tracks (by Apple track ID). No setlist or playlist data is sent to our backend for export; all happens in the browser with the user's Apple token.
