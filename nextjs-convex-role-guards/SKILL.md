---
name: nextjs-convex-role-guards
description: >
  Next.js + Convex UI-level access control and backend security mirroring. Use when implementing role-based access, protecting admin routes, or building layout wrappers. Triggers on "layout guard", "role check", "protect route", "admin only", "403 forbidden", or "authorization wrapper". Enforces in-place 403 rendering, the "no-redirect" rule, and mandatory Convex backend validation.
---

# Next.js + Convex Role Guards

Frontend authorization is an illusion. A UI guard is just visual sugar to prevent a "Flash of Content" and stop users from seeing buttons they cannot click. If you do not mirror the exact same role checks in your Convex backend, you are building a fake door. Furthermore, redirecting an unauthorized, authenticated user away from their intended URL destroys context and prevents easy account switching.

This skill enforces strict in-place 403 rendering and mandates the backend mirror.

## DO / DON'T Quick Reference

| DO (Defensive Auth) | DON'T (The Anti-Pattern) | Why |
|---|---|---|
| Render "Access Denied" (403) *in place* | Redirect unauthorized users to `/` or `/login` | The "No-Redirect" rule preserves the URL so the user can click "Switch Account" and instantly load the intended page. |
| Wait for both `!isLoading` AND `user !== undefined` | Render children based only on `isAuthenticated` | `isAuthenticated` resolves before the `user` object fetches. Failing to wait for the user data causes a "Flash of Content." |
| Wrap the specific layout content (e.g., `<main>`) | Wrap `<html>` and `<body>` in the Guard | Wrapping the document root breaks Next.js 16.2 structure and destroys global error boundaries. |
| Enforce roles via Convex `customMutation` / `customQuery` | Rely solely on the Next.js `layout.tsx` for security | Frontend components can be bypassed via the browser console or direct API requests. |

## Execution Protocol

When instructed to protect a route or implement role-based access:

### 1. Expose the Role (Backend)
Ensure the `users.current` Convex query explicitly returns the `role` field. The frontend cannot guard what it cannot read.

### 2. Implement the `RoleGuard` Component
Create a `"use client"` wrapper (`src/components/auth/role-guard.tsx`) that explicitly handles four states. Do not merge these states:
1.  **Loading:** `isLoading || (isAuthenticated && user === undefined)`. Return a spinner.
2.  **Unauthenticated:** `!isAuthenticated`. Return a sign-in prompt.
3.  **Unauthorized (403):** `user?.role !== requiredRole`. Render a hard error UI *in place* with buttons to "Return Home" and "Switch Account" (`signOut()`). **DO NOT use `router.push('/')` here.**
4.  **Authorized:** Return `<>{children}</>`.

### 3. Wrap the Layout
Inject the `<RoleGuard requiredRole="admin">` into the specific route group's `layout.tsx` (e.g., `(dashboard)/layout.tsx`). It must wrap the visual content, not the root HTML document.

### 4. The Mandatory Backend Mirror (Critical)
You must immediately enforce the identical role check in the Convex backend using `convex-helpers`. Do not leave the backend exposed.

```typescript
// convex/utils.ts
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { customMutation } from "convex-helpers/server/customFunctions";

export const adminMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("401: Unauthorized");
    
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") {
      throw new Error("403: Admin privileges required");
    }
    
    return { ctx: { user }, args: {} };
  }
});
// Usage: export const myAdminAction = adminMutation({ ... })
```

## The Edge Cases / Anti-Patterns

**When NOT to use this skill:**
* **Edge Middleware Authorization:** Next.js `proxy.ts` (middleware) cannot easily read Convex database roles without making an expensive external HTTP fetch on every single edge request. Do not attempt to read the Convex `user.role` inside Next.js middleware. Use the Client-side `RoleGuard` for UX, and the Convex `adminMutation` for true security.
* **Public Data with Admin Controls:** If a page is public but has "Admin Only" edit buttons, do not wrap the entire page in `<RoleGuard>`. Instead, fetch the user at the page level and conditionally render the specific `<EditButton>` components.
