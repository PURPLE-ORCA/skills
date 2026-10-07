# Next.js 16.3 patterns

Next.js 16.3 became a stable release on August 3, 2026. Its most important addition was Instant Navigations, an opt-in set of tools for making server-driven routes feel responsive without making every route fully static.

## Instant Navigations

- In 16.3, the release post gated Cache Components and Partial Prefetching behind `cacheComponents: true` and `partialPrefetching: true`.
- Follow the installed package docs before adding either flag. Next.js 16.4 changes the starting defaults for newly created apps, but existing apps still need deliberate migration.
- Use `<Suspense>` to stream a loading state or `'use cache'` to make eligible UI available from cache.
- Partial Prefetching builds a reusable route shell and reuses it across links. Add `<Link prefetch={true}>` only when a route needs more than its shell preloaded.
- Prefetch is disabled in development. Verify actual navigation behavior in production mode.
- Use the Next.js DevTools Instant Insights to find routes that block, and Navigation Inspector to see the shell that appears before the full response.
- Use the `instant()` Playwright helper to assert which content must appear immediately after navigation. Keep the test scoped to the user-visible shell, then assert streamed content separately.
- Do not copy preview-only route conventions into current code. The 16.4 release adds `ensureStatic` for routes that need explicit static guarantees.

## Other stable 16.3 changes

- Turbopack memory eviction reduced development memory use by up to 90% in the release team's tests. Treat this as a reported upper bound, not a promise for every app.
- Turbopack file-system caching applies to `next dev` and `next build`. Repeat builds can reuse unchanged artifacts.
- The App Router switched to native Node.js streams for server rendering. The release reported up to 22% more requests under load in its benchmarks.
- `next dev` writes or maintains a version-matched Next.js docs block in `AGENTS.md`. Point agents at `node_modules/next/dist/docs/` and prefer those docs over generic memory.
- Next.js added prefetch inlining to combine smaller prefetch payloads, and immutable static assets can be reused across deployments.
- `catchError` from `next/error` supports a custom error boundary with a `retry()` callback. It is useful when retrying failed Server Components and must not intercept `notFound()` or `redirect()` behavior incorrectly.
- `next/root-params` exposes root route params to Server Components without prop-drilling. The documented 16.3 support is for Server Components; verify current docs before using it in route handlers or Server Actions.
- Turbopack added `import.meta.glob` for loading multiple local files. Markdown or other non-JavaScript file types still need the appropriate loader configuration.
- The stable 16.3 release lets `next build` use TypeScript 7 for type checking after updating the local `typescript` dependency. Check the current `useTypeScriptCli` docs before changing compiler settings.

## Experimental features in 16.3

- The Rust React Compiler path uses `reactCompiler: true` with `experimental.turbopackRustReactCompiler: true`.
- Network resilience uses `experimental.useOffline: true` and the `useOffline` hook.
- Keep each experimental setting isolated and removable. Do not make it a default in a shared skill without checking its current status.

## Sources

- [Next.js 16.3 stable release](https://nextjs.org/blog/next-16-3)
- [Next.js 16.3 Instant Navigations](https://nextjs.org/blog/next-16-3-instant-navigations)
- [Version-matched docs for AI agents](https://nextjs.org/docs/app/guides/ai-agents)
- [Instant Navigation guide](https://nextjs.org/docs/app/guides/instant-navigation)
