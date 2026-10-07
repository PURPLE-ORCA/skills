# Next.js 16.4 patterns

Use this reference for the 16.4 additions. Confirm the installed version before relying on a new API.

## Cache Components

- The Next.js team recommends Cache Components as the default programming model and plans to make it the default in Next.js 17.
- New apps created with `create-next-app` in 16.4 enable Cache Components by default.
- Existing apps are not silently converted. The release post still documents `cacheComponents: true` and `partialPrefetching: true` as the flags for adopting the model.
- `'use cache'` marks a component or function as cacheable. `cacheLife()` selects its lifetime. Request-time data can sit beside cached UI under `<Suspense>`.
- Keep user-specific or otherwise request-dependent data outside a cache scope unless the cache key and privacy behavior are correct.

## Static guarantees

- `ensureStatic` lets a route or layout guarantee that its `shell`, `prefetch`, or `navigation` output stays static.
- Use `export const ensureStatic = 'navigation'` only when the whole navigation must remain static. Next.js fails the build if dynamic content violates that guarantee.
- Suspense does not bypass an `ensureStatic = 'navigation'` guarantee. For a fully static route, move personalization to a client-side request after hydration or omit it. If personalization must render on the server, remove the full-navigation guarantee and stream it beside cached UI with an appropriate `<Suspense>` boundary.
- Use the less restrictive `prefetch` or `shell` values only when that exact boundary matches the product's requirement.
- Do not add static guarantees to personalized routes simply to silence a slow-navigation warning.

## Deferring work from navigation stages

- `navigation()` excludes awaited cached content from a prefetch so it can load during a full navigation.
- `prefetch()` excludes cached content from the route shell so it can wait for an explicit prefetch.
- These APIs let a route include less work in its shell and more work in its completed response. Use them when eager prefetching has a measurable cost, such as large message threads.
- Read the installed API reference before using either function. Keep the data needed for the initial UI outside the deferred boundary.

## Agent workflows

- The agent upgrade workflow can prepare version-specific migration guidance and verification steps. The documented command is `npx next@canary upgrade --agent=latest`.
- The `canary` package is used for the upgrade tool; the `latest` policy selects the latest stable target unless the user asks for canary.
- `experimental.agentUpgrade` supports `security` (the default), `latest`, or `false` reminder policies.
- `experimental.agentFeedback` is enabled by default for new apps created with the recommended `create-next-app` settings. Existing apps can opt in. It requires Next.js Telemetry and does not run in CI. It creates editable drafts; nothing is sent until a person chooses to send it.

## Performance and experiments

- The release reports 20 to 25 percent less Turbopack disk-cache use, lazy server HMR, a shared Turbopack runtime chunk, smaller production bundles, and React 19.3.
- Experimental options include the Rust React Compiler improvements, Turbopack garbage collection (`turbopackGc`), lazy dynamic imports, and worker-thread plugin execution.
- On Node.js 24.13.1 and newer, the worker-thread plugin strategy currently falls back to child processes because of a Node.js bug.
- Keep experimental flags opt-in and evaluate memory, build time, and runtime behavior in the target project.

## Sources

- [Next.js 16.4](https://nextjs.org/blog/next-16-4)
- [Keeping pages static](https://nextjs.org/docs/app/guides/keeping-pages-static)
- [`ensureStatic` reference](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/ensureStatic)
- [`navigation()` reference](https://nextjs.org/docs/app/api-reference/functions/navigation)
- [`prefetch()` reference](https://nextjs.org/docs/app/api-reference/functions/prefetch)
- [Upgrade with a coding agent](https://nextjs.org/docs/app/guides/upgrading/agent-upgrade)
