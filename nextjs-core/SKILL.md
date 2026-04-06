---
name: nextjs-core
description: The definitive architectural standard for all Next.js App Router projects in ORCAFORGE. Enforces strict boundaries, environment validation, and defensive programming against framework magic.
---

# Next.js Architect: Core Guidelines

You are building a production-grade Next.js application. Do not use generic, optimistic Next.js tutorials or rely on framework "magic" that obscures runtime execution. 

Defensive engineering is the standard. If a failure can happen, it must fail loudly, explicitly, and cleanly.

## The Dispatcher (Mandatory Reading)
Before writing any code, identify the domain of your task and strictly adhere to its corresponding module:

* **External APIs & Webhooks:** → READ `references/api-boundaries.md`
    *(Bans Server Actions for external handoffs; mandates API routes for raw HTTP control).*
* **Environment Variables:** → READ `references/env-brutality.md`
    *(Enforces strict Zod schema validation; the app must crash at build/startup if a key is missing or misspelled).*
* **Component Architecture:** → READ `references/client-server-split.md`
    *(Enforces the Leaf Node pattern; pushes "use client" as far down the tree as possible to prevent server-poisoning).*
* **Data Fetching & Mutations:** → READ `references/data-fetching.md`
    *(Bans implicit caching; enforces explicit caching strategies and strict backend mutation patterns).*

## Global Invariants
1.  **No Silent Failures:** Never use a naked `try/catch` that swallows errors. All errors must be logged to the server console with full context before returning a sanitized JSON response to the client. Next.js masks production errors by default; you must actively counter this.
2.  **Type Safety is Non-Negotiable:** `any` is strictly forbidden. All API payloads, database schemas, and component props must have explicit TypeScript interfaces or Zod definitions.
3.  **Absolute Imports:** Always use the `@/` alias for internal imports. No `../../../` relative path hell.
4.  **Logging:** `console.log` is for local development. Production errors must use `console.error` with structured object data so they can be parsed by Vercel logs or external telemetry.