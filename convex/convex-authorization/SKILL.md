---
name: convex-authorization
description: >
  Convex backend authorization, RBAC, and team-scoped permissions. Use when writing mutations/queries that require user authentication, roles, or team memberships. Triggers on "protect mutation", "convex auth", "customMutation", "role based access", "team permissions", or "row level security". Enforces endpoint-level checks via convex-helpers and explicitly bans frontend-only security assumptions.
---

# Convex Authorization & Access Control

Authentication (who you are) is not Authorization (what you can do). 

Developers routinely wrap their Next.js components in `<Authenticated>` and assume their database is secure. It is not. If a mutation or query does not explicitly check the user's role or ownership *inside the Convex backend*, any user can open the browser console and execute that mutation. 

This skill enforces strict, endpoint-level backend authorization using `customMutation` wrappers. We do not trust the client. We do not rely on implicit database magic. 

## DO / DON'T Quick Reference

| DO (Defensive Backend) | DON'T (The Vulnerability) | Why |
|---|---|---|
| Enforce security inside the Convex `mutation`/`query` handler | Rely on Next.js `<Authenticated>` for data security | UI gates only hide buttons. They do not block API requests. |
| Use `customMutation` to inject validated users into `ctx` | Call `auth.getUserId()` manually in every single endpoint | Boilerplate breeds mistakes. A custom wrapper guarantees the check runs before the handler executes. |
| Authorize at the endpoint level (Bespoke logic) | Use Row-Level Security (RLS) as your primary defense | RLS is a "Last Resort". It creates invisible database magic that is notoriously difficult to debug and scales poorly. |
| Pass `role` requirements as wrapper arguments | Hardcode `if (user.role !== 'admin')` in 50 different files | Parametrized wrappers (`teamMutation({ role: "admin" })`) make security policies declarative and readable. |

## Execution Protocol

When instructed to build a protected Convex feature:

1. **The UI Gate (UX Only):** You may use `Authenticated`, `Unauthenticated`, and `AuthLoading` from `convex/react` to prevent "Flashes of Content" on the client. Acknowledge this is strictly for UX.
2. **The Backend Wrapper:** Does this mutation require a logged-in user? A specific role? A team membership? 
   * **READ:** `references/backend-auth-helpers.md` to select the correct `customMutation` wrapper.
3. **The Implementation:** Write the Convex endpoint using the selected wrapper (e.g., `userMutation`, `teamMutation`). Do not use standard `mutation` for protected routes.
4. **The Bespoke Check:** If the authorization logic is highly specific (e.g., "User must be an assigned judge for this specific assignment ID"), write the check explicitly at the top of the endpoint handler. Throw an error immediately if it fails.

## The Edge Cases / Anti-Patterns

**When NOT to use this skill:**
* **Public Endpoints:** If a query is truly public (e.g., reading a public blog post), use the standard `query` from `_generated/server` and do not wrap it.
* **Webhooks:** Webhooks (like Stripe/Payzone) are authenticated via HMAC signatures, not Convex Auth. Use standard `httpAction` and verify the signature manually. Do not try to wrap them in a `userMutation`.

**The RLS Ban:**
Unless explicitly instructed by the Lead Developer to implement a highly complex, multi-tenant data isolation layer, **DO NOT generate Row Level Security (RLS) wrappers**. They obscure intent. Put the authorization logic directly in the endpoint.
