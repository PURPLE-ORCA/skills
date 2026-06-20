---
name: convex-nextjs-realtime-pattern
description: "Use when implementing live reactive data in Next.js App Router with Convex. Covers preloadQuery + usePreloadedQuery server/client split, hydration safety, and common pitfalls."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [convex, nextjs, react, realtime, app-router, server-components]
    related_skills: [convex-pro-max, modern-nextjs]
---

# Convex + Next.js Real-Time Data Pattern

## Overview

In Next.js App Router, Server Components fetch data at build time or request time. Using `fetchQuery` from `convex/nextjs` in a Server Component gives you data, but it is **not reactive** — data doesn't update when the database changes, and Next.js may cache the page HTML.

This skill covers the `preloadQuery` + `usePreloadedQuery` pattern that gives you:
- **Fast initial render** — server fetches data, sends HTML
- **Live reactivity** — client subscribes to Convex via WebSocket, updates automatically

## When to Use

- User asks for "real-time data" or "live updates" in a Next.js + Convex app
- Data changes in Convex but the UI doesn't reflect it without refresh
- `fetchQuery` was used but isn't updating
- Need to keep `generateMetadata` server-side while making the page body reactive

## Architecture

```
page.tsx (Server Component)
  ├── generateMetadata()        ← stale/preloaded data is fine for SEO
  ├── preloadQuery(api.x.get)   ← fetches initial data
  └── <Content preloaded={...} />  ← passes Preloaded payload

_components/content.tsx (Client Component)
  ├── "use client"
  ├── usePreloadedQuery(preloaded)  ← gets initial data + subscribes
  └── renders UI                    ← updates live when DB changes
```

## Server Component (page.tsx)

```tsx
import { preloadedQueryResult } from "convex/nextjs";
import { getPreloadedXBySlug, getPreloadedXs } from "@/lib/convex/cache";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const preloaded = await getPreloadedXBySlug(slug);
  const data = preloadedQueryResult(preloaded);
  // ... metadata from data
}

export default async function Page({ params }) {
  const { lang, slug } = await params;
  const [dictionary, preloaded, preloadedAll] = await Promise.all([
    getDictionary(lang),
    getPreloadedXBySlug(slug),
    getPreloadedXs(),
  ]);

  return (
    <XContent
      dictionary={dictionary}
      preloaded={preloaded}
      preloadedAll={preloadedAll}
      lang={lang}
      slug={slug}
    />
  );
}
```

## Client Component (_components/content.tsx)

```tsx
"use client";

import { type Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/api";

interface XContentProps {
  dictionary: Dictionary;
  preloaded: Preloaded<typeof api.xs.getBySlug>;
  preloadedAll: Preloaded<typeof api.xs.getAll>;
  lang: "fr" | "ar" | "en";
  slug: string;
}

export function XContent({ dictionary, preloaded, preloadedAll, lang, slug }: XContentProps) {
  const data = usePreloadedQuery(preloaded);
  const allData = usePreloadedQuery(preloadedAll) ?? [];

  if (!data) return null;

  // ... render UI
}
```

## Key Rules

### 1. `"use client"` MUST be at the very top

```tsx
// ✅ CORRECT
"use client";
import { usePreloadedQuery } from "convex/react";

// ❌ WRONG — will throw build error
import { usePreloadedQuery } from "convex/react";
"use client";
```

### 2. NEVER put `"use client"` in page.tsx

If you need both server-side metadata and client-side reactivity, split into:
- `page.tsx` — Server Component, no `"use client"`
- `_components/content.tsx` — Client Component, `"use client"` at top

### 3. `fetchQuery` vs `preloadQuery`

| Function | Use Case | Reactive |
|----------|----------|----------|
| `fetchQuery` | Server Components, one-time fetch | ❌ No |
| `preloadQuery` | Server → Client handoff | ✅ Yes (via `usePreloadedQuery`) |
| `useQuery` | Client Components only | ✅ Yes |

### 4. Hydration Safety

When using `createPortal` or `typeof document` checks:

```tsx
// ❌ WRONG — causes hydration mismatch
if (typeof document === "undefined") return null;
return createPortal(children, document.body);

// ✅ CORRECT — render same DOM on server and client
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

if (!mounted) return <div>{children}</div>;
return createPortal(children, document.body);
```

### 5. React Keys with Duplicate Data

When array items may have duplicate values (e.g., image URLs), use index-based keys:

```tsx
// ❌ WRONG — duplicate URLs cause key collision
{images.map((img) => <div key={img}>...</div>)}

// ✅ CORRECT
{images.map((img, idx) => <div key={`slide-${idx}`}>...</div>)}
```

### 6. Keep `notFound()` guard in the Server Component

When moving data fetching from the page to a client component, don't remove the `notFound()` check from the server component. The client component returning `null` for missing data can cause a 500 error during Next.js static generation, whereas `notFound()` correctly produces a 404.

```tsx
// ✅ CORRECT — page.tsx still validates before passing to client
export default async function Page({ params }) {
  const preloaded = await getPreloadedXBySlug(slug);
  const data = preloadedQueryResult(preloaded);
  if (!data) notFound(); // ← keep this!

  return <XContent preloaded={preloaded} />;
}

// ❌ WRONG — removing notFound() can cause 500 in production
export default async function Page({ params }) {
  const preloaded = await getPreloadedXBySlug(slug);
  return <XContent preloaded={preloaded} />; // client returns null → 500
}
```

### "500 error after switching to preloadQuery + usePreloadedQuery"

If the page was previously working with `preloadedQueryResult` in the server component, and you moved data consumption to a client component via `usePreloadedQuery`, ensure you **keep the `notFound()` guard in the server component**. Returning `null` from a client component during static generation can cause Next.js to throw a 500 instead of a 404.

The pattern: server validates existence with `preloadedQueryResult` + `notFound()`, then passes the `Preloaded` object to the client which calls `usePreloadedQuery` for reactivity.

### "fetchQuery isn't real-time"

`fetchQuery` is intentionally non-reactive. It's for static data. If you need live updates, use `preloadQuery` + `usePreloadedQuery`.

### "useQuery in Server Component"

`useQuery` is a React hook — it only works in Client Components. Server Components must use `fetchQuery` or `preloadQuery`.

### "Hydration failed because server HTML didn't match"

Caused by:
- `typeof window` / `typeof document` branches that return different values
- `useMediaQuery` without proper server snapshot
- `createPortal` without mounted gate

Fix: Ensure server and client render identical initial HTML.

### "The 'use client' directive must be placed before other expressions"

Move `"use client"` to line 1 of the file. If the file is a page.tsx that also needs server exports, split it.

## Files Changed Pattern

```
src/app/[lang]/entity/[slug]/
├── page.tsx              # Server Component — metadata + preloadQuery
└── _components/
    └── content.tsx       # Client Component — usePreloadedQuery + render
```

## References

- [Convex Next.js Server Rendering Docs](https://docs.convex.dev/client/nextjs/app-router/server-rendering)
- `preloadQuery` uses `cache: 'no-store'` — disables Next.js static caching
- `usePreloadedQuery` subscribes to Convex WebSocket after hydration
- [[references/stays-500-debug.md]] — production 500 debug case study: why `notFound()` must stay in the server component
