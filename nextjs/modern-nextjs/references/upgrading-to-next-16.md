# Upgrading to Next.js 16

Use this checklist only when the user asked for an upgrade. Do not change a project's framework version during an unrelated task.

## Before changing dependencies

1. Read the app's `package.json`, lockfile, Node.js engine requirement, Next config, and package-manager scripts.
2. Read the official [version 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16).
3. Record the current versions of `next`, `react`, and `react-dom`. Next.js 16.4 ships React 19.3; resolve peer constraints instead of force-installing versions.
4. Read the app's version-matched docs under `node_modules/next/dist/docs/` when available.

## Choose the upgrade path

For the agent-guided flow, run the documented command from the app directory:

```bash
npx next@canary upgrade --agent=latest
```

It uses the canary upgrade CLI with the `latest` target policy. Do not interpret the CLI package tag as the app's target release tag.

For a manual npm upgrade, the 16.4 release post documents:

```bash
npm install next@latest
```

If React 19.3 features are part of the migration, update `react` and `react-dom` as needed after checking peer constraints. The Next.js version-16 guide also documents `pnpm add next@latest react@latest react-dom@latest` for pnpm projects.

Use the package manager and lockfile the project already uses. Do not change package managers as part of a framework upgrade unless requested.

## Review the migration

- `middleware.ts` and the named `middleware` export are deprecated in favor of `proxy.ts` and `proxy`. `proxy` uses Node.js and does not support Edge. Preserve Edge behavior where the app depends on it.
- Request-time APIs and route props are asynchronous. Await `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()`, including generated metadata and sitemap params.
- Next.js 16 uses Turbopack by default. Review custom webpack configuration and opt out only for a verified compatibility issue.
- `experimental.ppr`, `experimental.dynamicIO`, and `experimental.useCache` are removed. Adopt `cacheComponents` only when the app is ready for Cache Components and its Suspense requirements.
- `next lint` and the Next config `eslint` option are removed. Move to direct ESLint or Biome commands and update project scripts.
- Add `default.tsx` to every parallel route slot.
- Review image behavior changes, including the 4-hour `images.minimumCacheTTL` default, local image query-string rules, and deprecated `next/legacy/image` and `images.domains`.
- AMP support and `serverRuntimeConfig`/`publicRuntimeConfig` are removed.
- For Server Action mutations, use `updateTag` when the same user must immediately read the new value. Use `revalidateTag(tag, 'max')` for stale-while-revalidate.

## Agent docs and codemods

- The official guide documents `npx @next/codemod@canary agents-md` for setting up version-matched `AGENTS.md` docs. After the upgrade, verify that the managed block still points at the installed version's bundled docs.
- The pnpm upgrade codemod shown in the guide is `pnpm dlx @next/codemod@canary upgrade latest`.
- The upgrade codemod does not handle every migration. If synchronous request APIs remain, the guide documents `npx @next/codemod@canary next-async-request-api .`.
- Inspect every codemod diff. A successful command does not prove the app migrated correctly.

## Verification

1. Confirm `AGENTS.md` points to `node_modules/next/dist/docs/` for the installed version.
2. Run the existing typecheck, lint, unit, and end-to-end scripts from the app's package configuration.
3. On Next.js 16.3 or later with Turbopack, use the `next-dev-loop` skill when it is available. Otherwise verify with the project's dev server, browser, and build checks.
4. Run a production build. Do not treat dev-only success as proof for cache or prefetch behavior.
5. Test affected routes, redirects, parallel route fallbacks, image delivery, and Server Action read-your-writes behavior.
6. Check for old request API access, stale `middleware` references, deprecated config, and unexpected `--webpack` flags.
7. Report any failed check or migration that remains incomplete.
