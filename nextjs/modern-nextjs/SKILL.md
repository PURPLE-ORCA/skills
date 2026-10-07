---
name: modern-nextjs
description: "Next.js 16: use for App Router code, upgrades, or debugging."
---

# Modern Next.js 16

This skill targets stable Next.js 16.4 and retains the 16.3 patterns that still matter. It guides App Router implementation, debugging, and upgrades. It does not tell a project to upgrade. The installed version's bundled docs and the repository's instructions take precedence when they differ.

## When to use

- Build, review, refactor, debug, or migrate a Next.js App Router app.
- Work on Cache Components, streaming, prefetching, or navigation responsiveness.
- Upgrade to Next.js 16 or distinguish stable behavior from canary and experimental behavior.

## Prerequisites

- Check `package.json` and the lockfile for the installed `next`, `react`, and `react-dom` versions and the package manager.
- Read the repository's `AGENTS.md` and version-matched docs under `node_modules/next/dist/docs/` when available.
- Use the current official docs when the installed package does not bundle the needed reference. No new dependency is required for this skill.

## How to use

Read the reference that matches the task before using a release-specific API. Inspect the existing route, config, scripts, and tests first. Keep fixes scoped to the route or boundary that owns the behavior. For a framework upgrade, follow [`references/upgrading-to-next-16.md`](references/upgrading-to-next-16.md).

## Quick reference

| Do | Do not | Why |
|---|---|---|
| Await request-time APIs such as `params`, `searchParams`, `cookies()`, and `headers()`. | Read them synchronously. | Next.js 16 treats these APIs as asynchronous. |
| Use `proxy.ts` for the network boundary when migrating to the Next.js 16 convention. | Describe `middleware.ts` as removed or assume `proxy` supports Edge. | `middleware` is deprecated; `proxy` uses the Node.js runtime and does not support Edge. |
| Check whether `cacheComponents` is enabled before using Cache Components. | Assume `'use cache'` is active in every existing app. | Existing apps must opt into the model; 16.4 enables it by default only in newly created apps. |
| Use `revalidateTag(tag, 'max')` for stale-while-revalidate, or `updateTag` in a Server Action for read-your-writes. | Use the deprecated one-argument `revalidateTag` form. | The single-argument form is deprecated and produces a TypeScript error. |
| Add `default.tsx` to every parallel route slot. | Leave a slot without a default. | Next.js 16 builds fail when a parallel route slot lacks one. |
| Run ESLint or Biome directly. | Use `next lint`. | Next.js 16 removed `next lint`. |

## Procedure

1. Identify the installed Next.js version and whether the task uses App Router or Pages Router.
2. Read the repository instructions. Prefer the installed package's version-matched docs under `node_modules/next/dist/docs/`; if `AGENTS.md` includes a framework-generated docs pointer, follow it.
3. Classify the route behavior: request-time, cached, streamed, prefetched, or guaranteed static.
4. Load the matching reference below. Keep experimental APIs opt-in and version-gated.
5. Implement the smallest change that preserves the app's current architecture and business rules.
6. Run the scripts defined by the project. For release-sensitive behavior, verify against a production build, not only dev mode.

## Pitfalls

- Next.js 16.4 enables Cache Components by default in newly created apps. Do not assume existing apps have the flag enabled.
- `npx next@canary upgrade --agent=latest` uses canary upgrade tooling and targets the `latest` release policy. It does not mean the app is being upgraded to a canary release.
- Prefetching behavior is production-only. Dev mode alone cannot verify what a user sees during a prefetched navigation.
- A preview or experimental API can change before stable release. Check the installed package docs before recommending it.

## The edge case

These rules target the App Router. For Pages Router code, older framework versions, or apps that intentionally keep Edge middleware, follow the installed version's docs instead of applying App Router examples mechanically.

## Verification

Confirm the changed API exists in the installed version's docs, run the project's typecheck and build scripts, and test the affected route in production mode when caching or prefetching is involved.

## References

- [`references/next-16-core.md`](references/next-16-core.md). Load for shared Next.js 16 App Router and cache rules.
- [`references/next-16.3.md`](references/next-16.3.md). Load for the 16.3 stable features and Instant Navigations.
- [`references/next-16.4.md`](references/next-16.4.md). Load for 16.4 Cache Components, static guarantees, agent tools, and performance changes.
- [`references/upgrading-to-next-16.md`](references/upgrading-to-next-16.md). Load for an upgrade or migration task.
