# Cache Components (Next.js 16+)

This app currently runs on **Next.js 15**. Cache Components (PPR, `use cache`, `cacheLife`, `cacheTag`) are available in **Next.js 16+**. This doc describes the migration path and where caching would apply.

## When upgrading to Next 16

1. **Enable in config**

   ```ts
   // next.config.ts
   const nextConfig: NextConfig = {
     cacheComponents: true,  // Replaces experimental.ppr
     // ...
   }
   ```

2. **Current page shape** (no change required for 15 → 16)
   - The home page is a **static shell** (title, steps list) plus a **client component** (`SetlistImportView`) that fetches via Route Handlers. No server-side data fetching in the RSC tree yet, so there is nothing to put behind `use cache` today.
   - `loading.tsx` and `error.tsx` / `global-error.tsx` already follow the static/dynamic boundary pattern.

3. **Where Cache Components would help later**
   - **Static content**: The intro copy and steps list are already synchronous; they stay static.
   - **Server-fetched setlist**: If you ever fetch a setlist by ID in a Server Component (e.g. for SEO or share links), wrap that fetch in a function with `'use cache'`, `cacheTag('setlist', id)`, and `cacheLife('minutes')` so repeated views of the same setlist are cached.
   - **Health or config**: Any server-only read that rarely changes (e.g. feature flags) could use `'use cache'` with a suitable `cacheLife` and `cacheTag` for invalidation.

4. **Constraints**
   - Do not use `cookies()`, `headers()`, or `searchParams` inside `'use cache'`; pass needed values as arguments (they become part of the cache key).
   - Edge runtime and static export are not supported with Cache Components (Node.js server required).

## References

- [Next.js Cache Components guide](https://nextjs.org/docs/app/getting-started/cache-components)
- [use cache directive](https://nextjs.org/docs/app/api-reference/directives/use-cache)
