# Debug Log: Stays Detail Page 500 Error

## Symptom
- Production 500 error on `/[lang]/stays/[slug]`
- No console errors, no Convex logs (DB not hit)
- Other detail pages (travel, activities, omra) worked fine

## Root Cause
Refactoring from `preloadedQueryResult` in page.tsx to `usePreloadedQuery` in client component removed the `notFound()` guard from the server component. When `usePreloadedQuery` returned `undefined` (stale static params or missing data), the client component returned `null`, which Next.js static generation handled as a 500 instead of 404.

## The Fix

**Before (broken):**
```tsx
// page.tsx — no validation before passing to client
export default async function StayPage({ params }) {
  const preloadedStay = await getPreloadedStayBySlug(slug);
  return <StaySlugContent preloadedStay={preloadedStay} />;
}

// content.tsx — returns null on missing data
export function StaySlugContent({ preloadedStay }) {
  const stay = usePreloadedQuery(preloadedStay);
  if (!stay) return null; // ← causes 500 in prod
  return <StayLayout stay={stay} />;
}
```

**After (fixed):**
```tsx
// page.tsx — validate on server, then pass Preloaded object
export default async function StayPage({ params }) {
  const preloadedStay = await getPreloadedStayBySlug(slug);
  const convexStay = preloadedQueryResult(preloadedStay);
  if (!(convexStay && convexStay.display)) {
    notFound(); // ← proper 404
  }
  return <StaySlugContent preloadedStay={preloadedStay} />;
}

// content.tsx — consume preloaded data reactively
export function StaySlugContent({ preloadedStay }) {
  const stay = usePreloadedQuery(preloadedStay);
  if (!stay) return null; // safe here — server already validated
  return <StayLayout stay={stay} />;
}
```

## Lesson
When splitting a page into Server Component (page.tsx) + Client Component (content.tsx) for the `preloadQuery`/`usePreloadedQuery` pattern, **keep data validation (`notFound()`, error handling) in the server component**. The client component should assume valid data was passed, using `usePreloadedQuery` only for reactivity and rendering.
