# Data Fetching & Caching Constraints (Next.js 16.2)

Next.js 16 no longer aggressively caches dynamic data, and the global `fetch` API has been un-patched. We do not rely on implicit framework caching. We declare our intentions explicitly using the new Cache Components architecture.

## 1. Explicit Cache Opt-In
**RULE: Do not use legacy `fetch` cache options (`force-cache`, `revalidate`). Use the `'use cache'` directive.**

By default, data fetches in Next.js 16 run dynamically at request time. If you need caching, you must explicitly opt the function or component into the cache.

### The Modern Patterns:

**A. Real-Time / Dynamic Data (Default)**
Do nothing. Just `await fetch()`. It is dynamic by default.

**B. Cached with Expiration (Replacing ISR)**
Use the `'use cache'` directive combined with the `cacheLife` helper.
```typescript
import { cacheLife } from 'next/cache';

export async function getPublicProducts() {
  'use cache';
  cacheLife('hours'); // Uses standard profiles like 'seconds', 'minutes', 'hours', 'days'
  
  const res = await fetch('[https://api.example.com/products](https://api.example.com/products)');
  return res.json();
}
```

**C. Manual Invalidation (Tags)**
If you are caching data that needs to be purged upon mutation, use `cacheTag`.
```typescript
import { cacheTag } from 'next/cache';

export async function getUserProfile(id: string) {
  'use cache';
  cacheTag(`user-${id}`); // Tags this cache entry
  
  const res = await db.users.find(id);
  return res;
}
```

## 2. Server-First Fetching
**RULE: Fetch data in Server Components, not Client Components.**

* **The Problem:** Fetching data inside `useEffect` in a Client Component causes waterfall loading, exposes your API endpoints to the browser, and ruins SEO.
* **The Solution:** Fetch the data directly inside the Server Component (which supports `async/await`) and pass the result down to Client Components as props.

## 3. Explicit Cache Invalidation
**RULE: When mutating data, you must explicitly purge the cache.**

If you update a record via a Server Action or Route Handler, you must purge the cache using `revalidateTag` or `revalidatePath` so the UI reflects the change instantly.

```typescript
import { revalidateTag } from "next/cache";

export async function updateUserProfile(id: string, data: any) {
  await db.users.update(id, data);
  
  // ✅ GOOD: Explicitly purge the cache tag we set earlier
  revalidateTag(`user-${id}`);
}
```