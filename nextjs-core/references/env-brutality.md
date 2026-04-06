# Environment Variable Brutality

Next.js allows loose access to `process.env`, which leads to silent failures, undefined variables in production, and catastrophic debugging loops when a key is misspelled. 

We do not trust `process.env`. We validate it.

## 1. The Centralized Environment Source
**RULE: You must never access `process.env` directly in application code.**

* **The Problem:** Calling `process.env.PAYZONE_SECRET_KEY` deep in a component or API route assumes the key exists. If it's missing or typoed in Vercel, the app compiles fine but crashes at runtime.
* **The Solution:** All environment variables must be validated through a central Zod schema, typically located at `src/env.ts` (or `src/env.mjs`). You must import variables from this file, never from `process.env`.

## 2. Zod Schema Enforcement
**RULE: Every environment variable must have a strict Zod definition.**

Use `zod` to enforce types, minimum lengths, and URLs. If a variable fails validation during initialization, the app must throw a fatal error.

### Required Implementation Pattern:
Create a central `env.ts` file. If the project uses `@t3-oss/env-nextjs`, use that. If not, implement a manual Zod check that runs at the top level.

```typescript
// Example: src/env.ts
import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PAYZONE_MERCHANT_ACCOUNT: z.string().min(1, "Merchant account is required"),
  PAYZONE_SECRET_KEY: z.string().min(10, "Secret key must be valid"),
  PAYZONE_URL: z.string().url("Must be a valid URL"),
  CONVEX_HTTP_URL: z.string().url(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

const processEnv = {
  NODE_ENV: process.env.NODE_ENV,
  PAYZONE_MERCHANT_ACCOUNT: process.env.PAYZONE_MERCHANT_ACCOUNT,
  PAYZONE_SECRET_KEY: process.env.PAYZONE_SECRET_KEY,
  PAYZONE_URL: process.env.PAYZONE_URL,
  CONVEX_HTTP_URL: process.env.CONVEX_HTTP_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

const merged = serverSchema.merge(clientSchema);
const parsed = merged.safeParse(processEnv);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables. Check server logs.");
}

export const env = parsed.data;
```

## 3. Usage in Code
**RULE: Import from the validated `env` object.**

```typescript
// app/api/payzone/init/route.ts
import { env } from "@/env"; // DO NOT USE process.env

// TypeScript now guarantees these exist and are non-empty strings
const secretKey = env.PAYZONE_SECRET_KEY; 
```

## 4. Client vs. Server Separation
**RULE: Never leak server secrets to the client schema.**
Any variable prefixed with `NEXT_PUBLIC_` goes into the client schema. Everything else goes into the server schema. Do not mix them.
```
