# Cache Components (Next.js 16)

Cache Components (`use cache`, `cacheLife`, `cacheTag`, PPR) are available in Next.js 16, which this app uses. To enable them, set `cacheComponents: true` in `next.config.ts`.

## Current state

Nothing uses `use cache` yet. The home page is a static shell (title, steps list) plus a client component (`SetlistImportView`) that fetches via Route Handlers after user input. There's no server-side data fetching in the RSC tree to cache.

## Where caching would help

- **Server-fetched setlist**: If you add a Server Component that fetches a setlist by ID (e.g. for SEO or share links), wrap the fetch in a `'use cache'` function with `cacheTag('setlist', id)` and `cacheLife('minutes')`. Repeated views of the same setlist hit the cache.
- **Health or config**: Any server-only read that rarely changes (feature flags, remote config) suits `'use cache'` with a long `cacheLife` and a tag for manual invalidation.

## Constraints

- Don't call `cookies()`, `headers()`, or `searchParams` inside a `'use cache'` function. Pass needed values as arguments — they become part of the cache key.
- Cache Components require the Node.js runtime. Edge runtime and static export are not supported.

## References

- [Next.js Cache Components guide](https://nextjs.org/docs/app/getting-started/cache-components)
- [use cache directive](https://nextjs.org/docs/app/api-reference/directives/use-cache)
