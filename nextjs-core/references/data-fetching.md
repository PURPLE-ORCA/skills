# Data Fetching & Caching Constraints

Next.js aggressively caches data fetches by default. If you do not explicitly define a caching strategy, Next.js will cache the result at build time or during the first request, leading to stale data bugs that are notoriously difficult to track down.

We do not rely on implicit framework caching. We declare our intentions explicitly.

## 1. Explicit Fetch Behavior
**RULE: Every native `fetch` call must explicitly define its cache or revalidation strategy.**

Never write a naked `fetch(url)`. You must tell the framework exactly how to handle the data lifecycle.

### The Three Acceptable Patterns:

**A. Real-Time / Dynamic Data (No Caching)**
Use this for user-specific data, dashboards, or anything that changes frequently.
```typescript
// ✅ GOOD: Explicitly disables caching
const res = await fetch('[https://api.example.com/data](https://api.example.com/data)', { 
  cache: 'no-store' 
});
```

**B. Static Data with Expiration (ISR)**
Use this for blogs, public listings, or data that updates on a predictable schedule.
```typescript
// ✅ GOOD: Caches the data but revalidates every 3600 seconds (1 hour)
const res = await fetch('[https://api.example.com/data](https://api.example.com/data)', { 
  next: { revalidate: 3600 } 
});
```

**C. Permanent Static Data**
Use this *only* for data that will literally never change between deployments (e.g., static configuration).
```typescript
// ✅ GOOD: Explicitly tells the reader this is locked in cache
const res = await fetch('[https://api.example.com/static-config](https://api.example.com/static-config)', { 
  cache: 'force-cache' 
});
```

## 2. Server-First Fetching
**RULE: Fetch data in Server Components, not Client Components.**

* **The Problem:** Fetching data inside `useEffect` in a Client Component causes waterfall loading, exposes your API endpoints to the browser, and ruins SEO.
* **The Solution:** Fetch the data directly inside the Server Component (which supports `async/await`) and pass the result down to Client Components as props.

```tsx
// ❌ BAD: Client-side fetching waterfall
"use client";
import { useEffect, useState } from "react";

export function UserList() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    fetch('/api/users').then(res => res.json()).then(setUsers);
  }, []);
  return <div>...</div>;
}

// ✅ GOOD: Server-side fetching
// page.tsx (Server Component)
import { UserListClient } from "./UserListClient";

export default async function Page() {
  // Fetches securely on the server
  const res = await fetch('[https://api.example.com/users](https://api.example.com/users)', { cache: 'no-store' });
  const users = await res.json();
  
  // Passes data as a prop
  return <UserListClient initialUsers={users} />;
}
```

## 3. Explicit Cache Invalidation
**RULE: When mutating data, you must explicitly purge the cache.**

If you update a record in your database via a Server Action or Route Handler, Next.js will not automatically know that the cached `fetch` on your dashboard is now stale. You must tell it to revalidate.

```typescript
import { revalidatePath, revalidateTag } from "next/cache";

export async function updateRecord(id: string, data: any) {
  await db.records.update(id, data);
  
  // ✅ GOOD: Explicitly purge the cache for the dashboard
  revalidatePath("/dashboard");
  
  // OR purge by specific fetch tag
  // revalidateTag("records"); 
}
```

## 4. Convex & Reactivity Exception
**NOTE:** If you are using Convex for data fetching (e.g., `useQuery`, `ctx.runQuery`), Convex handles its own WebSocket-based reactivity. Do not wrap Convex queries in Next.js `fetch` logic. Use the native Convex hooks in Client Components or Convex Node clients in API routes as documented in the Convex SDK.
