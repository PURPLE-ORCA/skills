---
name: modern-nextjs
description: >
  Modern Next.js 16.2 best practices, App Router architecture, React 19.2 integration, and MCP Agent flows. Use when writing, reviewing, refactoring, or migrating Next.js code. Triggers on "next.js 16", "update nextjs", "nextjs caching", "proxy.ts", "middleware.ts", "AGENTS.md", "use cache", or "transitionTypes". MUST use this skill to prevent legacy Next.js 14/15 anti-patterns.
---

# Modern Next.js (v16.2) Complete Guide

This skill enforces strict Next.js 16.2 architecture. The framework has fundamentally changed how caching, middleware, route parameters, and AI-assisted debugging work.

Every section follows: **what it is** → **DO this** → **DON'T do that** → **migration path**.

## Critical DO / DON'T Quick Reference

| DO (Modern Next.js 16.2) | DON'T (Legacy/Anti-pattern) | Why |
|---|---|---|
| Use `proxy.ts` | Use `middleware.ts` | The file was renamed to `proxy.ts` and runs on the Node.js runtime. It clarifies it is a network boundary, not heavy business logic. |
| `await params` and `await searchParams` | Access `params.slug` synchronously | Route parameters are now Promises. Synchronous access will throw a runtime error. |
| `use cache` directive | Rely on Vercel's default aggressive caching | Caching is now **opt-in** via Cache Components. Dynamic data runs at request time unless explicitly cached. |
| `<Link transitionTypes={['slide']}>` | Bring in heavy third-party animation libraries | Next.js 16.2 natively integrates React 19.2 View Transitions into the router via the `transitionTypes` prop. |
| Use `updateTag('my-data')` in Server Actions | Rely solely on `revalidatePath` | `updateTag` provides strict "read-your-writes" semantics for instant UI updates. |
| Add an `AGENTS.md` file to the root | Assume AI agents understand your app | 16.2 ships with bundled docs and MCP devtools. `AGENTS.md` directs the LLM to read local context first. |
| Run `eslint` or `biome` directly | Run `next lint` | The `next lint` command is officially removed. |
| Explicit `default.js/tsx` in Parallel Routes | Leave parallel route slots empty | Builds will now fail without a `default.js` in every parallel route slot. |

---

## Core Architecture Changes (Next.js 16+)

### 1. The `proxy.ts` Migration
**What it is:** `middleware.ts` is gone. It is now `proxy.ts`, running on the Node.js runtime by default (as of 15.5/16.0). 

```typescript
// ---- DON'T: The Legacy Next 14/15 Way ----
// middleware.ts
export function middleware(request: NextRequest) { ... }

// ---- DO: The Modern Next 16 Way ----
// proxy.ts (in root or /src)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Lightweight routing layer
  const token = request.cookies.get('session');
  if (!token) return NextResponse.redirect(new URL('/login', request.url));
  return NextResponse.next();
}
```

### 2. Asynchronous Route APIs
**What it is:** `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` are strictly asynchronous. 

```tsx
// ---- DON'T: Synchronous Access (Will Crash) ----
export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug); 
  return <h1>{post.title}</h1>;
}

// ---- DO: Asynchronous Access ----
export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const post = await getPost(resolvedParams.slug);
  return <h1>{post.title}</h1>;
}
```

### 3. Opt-In Cache Components (`use cache`)
**What it is:** Next.js stopped aggressively caching dynamic data. The `experimental.ppr` and `experimental.dynamicIO` flags are dead. To cache a component or function, explicitly opt-in.

```tsx
// ---- DO: Explicit Caching ----
import { db } from '@/lib/db';

export default async function CachedProductList() {
  'use cache'; // Opt-in to the new Cache Components model
  
  const products = await db.products.findMany();
  return (
    <ul>
      {products.map(p => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
}
```

---

## The 16.2 Features (March 2026)

### 1. AI-Assisted Debugging (MCP & `AGENTS.md`)
Next.js 16.2 treats coding agents as first-class users. 
*   **DO:** Create an `AGENTS.md` file in the root directory that tells your AI assistant to read the bundled docs (`node_modules/next/dist/docs/`) before writing code.
*   **DO:** Use the `next-devtools-mcp` package so your AI can inspect React component trees, read server logs, and parse hydration diffs directly from the dev server.

### 2. Native View Transitions on `<Link>`
You no longer need Framer Motion just to slide between pages.

```tsx
import Link from 'next/link';

// ---- DO: Native Next.js 16.2 Transitions ----
export function Navigation() {
  return (
    <Link href="/dashboard" transitionTypes={['slide']}>
      Dashboard
    </Link>
  );
}
```

### 3. The Stable Adapter API
Next.js 16.2 officially absorbed the OpenNext philosophy. Next.js now produces a typed, versioned build output.
*   **DON'T:** Hack build scripts to deploy to Cloudflare, AWS, or Netlify.
*   **DO:** Use the official Next.js Build Adapters API.

---

## Anti-Patterns to Fix Immediately

1. **Ignoring Hydration Diffs:** Next.js 16.2 explicitly shows `+ Client / - Server` diffs in the terminal. Do not ignore these; fix the React mismatch.
2. **Missing `default.tsx`:** Every parallel route slot must have an explicit `default.tsx`. If you don't need a default state, return `null`.
3. **Using `next/legacy/image`:** The legacy image component is officially deprecated. Furthermore, `images.minimumCacheTTL` now defaults to 4 hours (up from 60s).
4. **Keeping AMP:** AMP support has been completely ripped out of the framework. Remove all `useAmp` hooks.

## Migration Execution Checklist
1. Rename `middleware.ts` to `proxy.ts` and rename the exported function to `export function proxy(...)`.
2. Wrap all `params` and `searchParams` usages in `await`. Update your TypeScript interfaces to reflect `Promise<{ ... }>`.
3. Wrap `cookies()`, `headers()`, and `draftMode()` in `await`.
4. Run `npm uninstall eslint-config-next` and configure ESLint Flat Config or Biome directly.
5. Create an `AGENTS.md` file in the root to hook into 16.2's bundled AI documentation.
6. Replace `experimental.ppr` in your config with `cacheComponents: true` and start using the `'use cache'` directive.
```