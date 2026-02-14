# Completed: Environment and configuration (T001–T005)

**Done:** 2025-02-14

## Summary

- **T001** – `.env.example` lists all five env vars with placeholder text: `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `SETLISTFM_API_KEY`, `NEXT_PUBLIC_APPLE_MUSIC_APP_ID`. Added `NEXT_PUBLIC_API_URL` for the web app.
- **T002** – `docs/tech/apple-music.md`: added "Setup (obtaining credentials)" with steps and link to Apple Music Kit docs.
- **T003** – `docs/tech/setlistfm.md`: added "Base URL and API key" and "Obtaining an API key"; base URL and `x-api-key` header documented.
- **T004** – `.gitignore` already contained `.env` and `.env.local`; no real secrets in repo.
- **T005** – `apps/web/src/lib/config.ts` defines `API_BASE_URL` from `NEXT_PUBLIC_API_URL`; `.env.example` and `docs/tech/frontend.md` updated.

## Files touched

- `.env.example`
- `docs/tech/apple-music.md`
- `docs/tech/setlistfm.md`
- `docs/tech/frontend.md`
- `apps/web/src/lib/config.ts`
- `docs/exec-plans/implementation-tasks.md` (progress line)
