---
name: convex-auth
description: >
  Convex Auth setup for Next.js App Router with Email OTP, Resend, JWT keys, route guards, and reusable backend packaging. Use when implementing Convex authentication, OTP sign-in, Resend email codes, ConvexAuthNextjsProvider, ConvexAuthNextjsServerProvider, auth HTTP routes, JWT_PRIVATE_KEY/JWKS setup, auth.config.ts, proxy.ts auth guards, or wiring an existing login form to useAuthActions. Triggers on "convex auth", "OTP auth", "Resend OTP", "signIn resend-otp", "JWT_PRIVATE_KEY", "JWKS", "ConvexAuthNextjsProvider", "convexAuthNextjsMiddleware", or "wire login form". Enforces current Convex Auth patterns and bans fake client auth simulations.
---

# Convex Auth: OTP, Resend, Next.js

Fake auth flows are demo-code malware. If UI says "OTP sent" while `setTimeout` plays backend, you built login-themed spinner, not authentication. This skill enforces real Convex Auth: backend provider, HTTP auth routes, JWT env, Next App Router providers, route guards, and client form wiring.

## DO / DON'T Quick Reference

| DO (Modern Standard) | DON'T (Legacy Garbage) | Why |
|---|---|---|
| Use Convex Auth `Email({ id: "resend-otp" })` with Resend | Simulate OTP with `setTimeout`, local state, or alerts | Users need sessions, not theater. |
| Add `auth.addHttpRoutes(http)` in `convex/http.ts` | Forget auth HTTP routes | OTP callbacks and token refresh need actual routes. |
| Wrap App Router with `ConvexAuthNextjsServerProvider` + client provider | Use only `ConvexAuthNextjsProvider` | SSA auth context breaks without server wrapper. |
| Generate `JWT_PRIVATE_KEY` and `JWKS` per deployment | Reuse random secrets across apps or paste malformed PEM | Bad JWT env creates silent auth failures. |
| Guard app routes in `src/proxy.ts` with `convexAuthNextjsMiddleware` | Put auth redirects inside client layouts | Client guards flash UI and waste JS. |
| Parse `unknown` auth errors into user-safe messages | `catch (e: any)` or dump provider errors to UI | Leaking provider errors is amateur hour. |

## Execution Protocol

When implementing Convex Auth:

1. **Verify Docs:** Read current Convex Auth docs for provider, Next.js provider, middleware/proxy, and manual JWT env. Training data rots.
2. **Choose Scope:** If backend is reusable, create it as its own Convex project/package. Do not shove reusable auth into one app and call it architecture.
3. **Backend Auth Core:** Read `references/backend-otp-resend.md` and implement `auth.ts`, `auth.config.ts`, `http.ts`, `schema.ts`, OTP provider, and `users.currentUser`.
4. **Next.js Wiring:** Read `references/nextjs-app-router.md` and wire providers, route guards, and login form calls.
5. **Env/JWT:** Read `references/env-and-jwt.md` before touching deployment env. Handle secrets like they bite.
6. **Verify:** Run typecheck/build. Do not run `convex dev` unless user explicitly allows it.

## The Edge Case

Do not use this skill for authorization/RBAC endpoint checks after auth already exists. Use `convex-authorization` or `nextjs-convex-role-guards` for role enforcement. This skill sets up authentication and session plumbing; authorization still belongs inside Convex queries/mutations.

Do not use this skill for third-party auth stacks like Clerk/Auth0 unless user explicitly asks to migrate into Convex Auth. Different beast, different failure modes.
