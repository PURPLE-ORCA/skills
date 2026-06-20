---
name: nextjs-error-boundaries
description: >
  Next.js 16.2 App Router error boundary architecture. Use when implementing error handling, creating error.tsx/global-error.tsx files, or debugging white-screen failures. Triggers on "error boundary", "white screen", "error.tsx", "global-error.tsx", "next.js error", or "digest hash". Enforces mandatory global-error.tsx, feature-level error.tsx boundaries, external telemetry with error.digest, and hard-navigation escape hatch.
---

# Next.js Error Boundaries: The App Router Defense System

The Next.js App Router does not give you a console in production. When a server error occurs, Next.js intercepts it, generates a `digest` hash, and shows a sanitized message to the user. Without external telemetry, you have zero visibility into what broke. Without `global-error.tsx`, a root-layout failure produces a white screen with no recovery path. Without feature-level boundaries, one broken component takes down the entire route tree.

This skill enforces defensive error architecture that prevents silent failures, maintains granular UX, and ensures you actually know what went wrong in production.

## DO / DON'T Quick Reference

| DO (Modern Next.js 16.2) | DON'T (Legacy/Anti-pattern) | Why |
|---|---|---|
| Create `app/global-error.tsx` with `<html>` and `<body>` | Rely solely on root `error.tsx` | Root-layout errors bypass `error.tsx` and show a white screen. `global-error.tsx` is the only fallback. |
| Add `error.tsx` to every feature route segment (e.g., `app/checkout/error.tsx`) | Single `app/error.tsx` for entire app | One component crash should not kill the whole page layout. Granular boundaries preserve navigation. |
| Pass `error` and `error.digest` to external telemetry in `useEffect` | Use `console.error` as sole mechanism | Next.js swallows server errors in production. `console.error` goes nowhere. You must send to Sentry/Datadog/custom API. |
| Use `reset()` + hard navigation fallback (`window.location.href`) | Rely only on `reset()` | If the React tree is poisoned (e.g., corrupted context), `reset()` re-renders the same broken tree. Hard navigation forces a fresh app shell. |
| Use Next.js native `error.tsx` conventions | Build manual React Class Component error boundaries | Next.js error boundaries are a first-class framework feature. Class Components with `componentDidCatch` are obsolete in App Router. |

## Execution Protocol

When implementing error boundaries in a Next.js App Router project:

1. **Verify Root Safety:** Check that `app/global-error.tsx` exists. If not, create it with `'use client'`, proper `<html>` and `<body>` tags, and telemetry in `useEffect`.

2. **Map Route Segments:** Identify all leaf-route segments (e.g., `/dashboard`, `/checkout`, `/settings`). Ensure each has its own `error.tsx`.

3. **Implement Telemetry:** In every `error.tsx`, add a `useEffect` that calls an external observability service with both `error` and `error.digest`.

4. **Add Escape Hatch:** In every `error.tsx`, wrap `reset()` in a try/catch. If it fails or if the error is non-recoverable, execute `window.location.href = '/'` or similar hard navigation.

5. **Ban Legacy Patterns:** Search the codebase for `componentDidCatch`, `getDerivedStateFromError`, or class-based error boundaries. Remove them. Use Next.js file conventions only.

## The Edge Cases

**When NOT to use this skill:**

- **Pages Router:** This skill applies only to App Router. Pages Router uses `getStaticProps`/`getServerSideProps` error handling.
- **Static Export:** If you export with `output: 'export'`, `global-error.tsx` has limited effect since there is no server to catch root-layout failures.
- **API Routes:** API route errors are handled by `pages/api/error.tsx` (Pages Router) or by throwing in the handler function (App Router uses Route Handlers in `app/api/*`).
- **Middleware Errors:** `proxy.ts` errors do not trigger `error.tsx`. Middleware failures result in a 500 response, not a React boundary. Handle those in the proxy function itself.

## Implementation Pattern

```typescript
// app/global-error.tsx
'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      extra: { digest: error.digest },
    });
  }, [error]);

  const handleReset = () => {
    try {
      reset();
    } catch {
      window.location.href = '/';
    }
  };

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-bold">Application Error</h2>
          <p className="text-muted-foreground">
            {error.digest ? `Error ID: ${error.digest}` : 'An unexpected error occurred'}
          </p>
          <button
            onClick={handleReset}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
```

```typescript
// app/checkout/error.tsx (feature-level)
'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CheckoutError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      extra: { digest: error.digest, route: '/checkout' },
    });
  }, [error]);

  const handleReset = () => {
    try {
      reset();
    } catch {
      window.location.href = '/';
    }
  };

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold">Checkout unavailable</h2>
      <p className="text-sm text-muted-foreground">
        {error.digest ? `Error ID: ${error.digest}` : 'Something went wrong'}
      </p>
      <div className="flex gap-2">
        <Button onClick={handleReset}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/')}>
          Go home
        </Button>
      </div>
    </div>
  );
}
```

## Anti-Patterns to Fix Immediately

1. **Missing `global-error.tsx`:** Deploy to production and trigger a root-layout error (e.g., throw in `layout.tsx`). If you see a white screen, you need this file.

2. **Telemetry Without `digest`:** Sending `error.message` alone loses the correlation. Always include `error.digest` so you can look up the server-side stack trace in your logs.

3. **`reset()` Without Fallback:** If a component crashes due to corrupted state (e.g., a broken Context provider), `reset()` re-renders the same broken tree. Users get stuck in an error loop.

4. **Class-Based Boundaries:** Searching for `class.*extends.*Component` with `componentDidCatch` is a red flag. Delete it. Use the file-convention approach.

5. **Hardcoded Error Messages:** Never expose raw stack traces or database errors to the user. Sanitize in the error component, send raw to telemetry.