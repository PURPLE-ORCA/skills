# Next.js App Router Wiring

Auth wiring belongs at root and network boundary. Do not sprinkle auth checks through client components like confetti.

## Required Packages

```bash
bun add convex @convex-dev/auth
```

Frontend env:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

Public URL is client-visible by design. Secrets stay in Convex dashboard, not `.env.local`.

## Client Provider

```tsx
"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

const convex = new ConvexReactClient(
  convexUrl ?? "https://placeholder.convex.cloud",
);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convexUrl && typeof window !== "undefined") {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
  }

  return (
    <ConvexAuthNextjsProvider client={convex}>
      {children}
    </ConvexAuthNextjsProvider>
  );
}
```

Placeholder prevents static prerender from exploding in starter templates. Runtime still screams when env is missing.

## Root Layout

```tsx
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en">
        <body>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
```

Server provider wraps `html`. Missing this causes weird auth context failures during prerender/hydration.

## `src/proxy.ts` Route Guard

Next 16 renamed `middleware.ts` to `proxy.ts`. Use `proxy.ts` for modern projects.

```ts
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isAuthRoute = createRouteMatcher(["/auth"]);
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/settings(.*)",
  "/projects(.*)",
  "/team(.*)",
  "/analytics(.*)",
  "/messages(.*)",
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const isAuthenticated = await convexAuth.isAuthenticated();

  if (isAuthRoute(request) && isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }

  if (isProtectedRoute(request) && !isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/auth");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

Proxy redirects are UX/perimeter. They do not replace backend authorization checks.

## Login Form Wiring

Use `useAuthActions().signIn`. Two calls. Same provider id. First call sends email. Second call verifies code.

```tsx
"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const OTP_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getRawErrorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data = error.data;

    if (typeof data === "string") return data;
    if (data && typeof data === "object" && "message" in data) {
      return String(data.message);
    }
  }

  if (error instanceof Error) return error.message;
  return "Unknown auth error";
}

function getAuthErrorMessage(error: unknown): string {
  const message = getRawErrorMessage(error).toLowerCase();

  if (message.includes("could not verify code")) return "Invalid code. Check digits and try again.";
  if (message.includes("expired")) return "Code expired. Request a new one.";
  if (message.includes("rate") || message.includes("too many")) return "Too many attempts. Wait, then try again.";
  if (message.includes("email")) return "Enter a valid email address.";

  return "Auth failed. Try again.";
}

export function LoginForm() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("email", normalizedEmail);

      await signIn("resend-otp", formData);
      setSentTo(normalizedEmail);
      setCode("");
      setError(null);
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sentTo || code.length !== OTP_LENGTH) return;

    try {
      const formData = new FormData();
      formData.append("email", sentTo);
      formData.append("code", code);

      await signIn("resend-otp", formData);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
      setCode("");
    }
  }

  // Render using project UI primitives. Do not paste generic HTML if shadcn exists.
}
```

## Anti-Patterns

- Do not fetch auth state in `useEffect` for initial page gating.
- Do not put provider inside route group layout only. Auth context must cover all auth-aware routes.
- Do not call `signIn("resend")` if backend provider id is `resend-otp`.
- Do not redirect with `window.location`; use `router.replace`.
