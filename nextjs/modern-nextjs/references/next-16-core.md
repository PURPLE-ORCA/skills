# Next.js 16 core patterns

Use this reference for behavior shared across the Next.js 16 release line. The installed version's bundled docs remain authoritative.

## App Router request boundaries

- Treat `params` and `searchParams` props as Promises. Await them before reading values.
- Await request APIs including `cookies()`, `headers()`, and `draftMode()`.
- The same async migration applies to dynamic metadata files such as `opengraph-image`, `twitter-image`, `icon`, and `apple-icon`, and to generated sitemap parameters.
- Prefer generated helpers such as `PageProps<'/blog/[slug]'>` where available. They keep route params typed to the route.
- Keep server-only data access in Server Components or server functions. Add a `'use client'` boundary only for interactivity, browser APIs, or client-only dependencies.

## `middleware` to `proxy`

- Next.js 16 deprecates the `middleware` filename and export in favor of `proxy`.
- Rename the file to `proxy.ts` and export `proxy` when adopting the new convention.
- `proxy` runs on Node.js. It does not support the Edge runtime.
- If the app requires Edge middleware, do not mechanically migrate it. Check the installed version's migration docs and preserve the required runtime.
- Keep `proxy` focused on routing and request-boundary work. Put domain logic in the appropriate server layer.

## Caching and invalidation

- Next.js 16 has two caching models. Inspect `cacheComponents` before applying examples.
- In the Cache Components model, `'use cache'` opts a component or function into caching. Use `cacheLife` to select a lifetime and `cacheTag` to identify data for invalidation.
- In the previous model, `fetch` is not cached by default. Do not infer a route's caching behavior from an older Next.js version.
- Use `revalidateTag(tag, 'max')` when stale data may be served while refresh runs in the background.
- Use `updateTag(tag)` in a Server Action when the mutation needs read-your-writes behavior. It expires the relevant cache and refreshes it in the same request.
- Use `revalidatePath` when invalidation is route-scoped. Do not substitute it for a data-tag rule without checking the cache model.

## Routing and build changes

- Add `default.tsx` to every parallel route slot. Return `null` or call `notFound()` when no fallback UI is intended.
- Next.js 16 uses Turbopack by default. Inspect the project's Turbopack configuration before using `--webpack` as a temporary escape hatch.
- `next lint` and the Next config `eslint` option are removed. Invoke ESLint or Biome directly through the project's scripts.
- Next.js 16 removes AMP support, `serverRuntimeConfig`, and `publicRuntimeConfig`.
- The default `images.minimumCacheTTL` changed from 60 seconds to 4 hours. Review cache expectations before upgrading image-heavy apps.

## React version boundary

- Next.js 16.4 ships with React 19.3.
- Do not assume every Next.js 16 project uses the same React version. Read the lockfile and peer dependency constraints before proposing a React change.

## Sources

- [Upgrade to Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Caching without Cache Components](https://nextjs.org/docs/app/guides/caching-without-cache-components)
- [Next.js 16.4](https://nextjs.org/blog/next-16-4)
