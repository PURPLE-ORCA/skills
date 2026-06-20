# API Boundaries & External Integrations

Next.js App Router aggressively optimizes for internal data fetching and mutations. When integrating with external systems (Payment Gateways, Webhooks, Third-Party APIs), this framework "magic" becomes a liability. You must build defensive, observable HTTP boundaries.

## 1. The Server Action Ban
**RULE: Do not use Server Actions (`use server`) for external API handoffs or initialization.**

* **The Problem:** Next.js intentionally strips stack traces and error messages from Server Actions in production builds to prevent secret leakage. When a third-party integration fails, the client receives a generic `Error occurred in Server Components render`, leaving you completely blind to the actual failure.
* **The Exception:** Server Actions are strictly reserved for *internal* logic (e.g., executing a Convex mutation, updating your own database).

## 2. The API Route Standard
**RULE: All external handoffs must be handled via standard API Routes (`app/api/.../route.ts`).**

API Routes give you absolute control over the HTTP response, explicit status codes, and server-side visibility.

### Required Implementation Pattern:
1.  **Parse & Validate:** Always parse the incoming request body and validate required fields immediately. Return `400 Bad Request` if missing.
2.  **Environment Check:** Explicitly verify required external keys before attempting the integration. Return `500 Internal Server Error` if missing, and log the exact missing key.
3.  **Sanitized Client Errors:** Log the raw error to `console.error` on the server, but return a clean, sanitized JSON `{ error: string }` to the client.

```typescript
// Example: app/api/external-service/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { reference, amount } = await req.json();

    if (!reference || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const apiKey = process.env.EXTERNAL_API_KEY;
    if (!apiKey) {
      // Log loudly to the server console/telemetry
      console.error("CRITICAL: EXTERNAL_API_KEY is missing from environment variables.");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // ... execute external integration ...

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    // Expose the raw error to Vercel Logs, hide it from the browser
    console.error("External Integration Error:", error);
    return NextResponse.json({ error: "Integration failed. Please try again." }, { status: 500 });
  }
}
```

## 3. Webhooks & The Localhost Trap
**RULE: Never route external callbacks or webhooks to `localhost`.**

External servers cannot resolve your local development machine. 
* If a third-party service requires a `callbackUrl` or webhook destination, you must use a public URL.
* In development, this means routing through a public tunnel (like Ngrok or Cloudflare Tunnels) or pointing the callback directly to your live edge router (e.g., your Convex HTTP URL). 
* Always verify `NEXT_PUBLIC_APP_URL` is correctly set for the current environment before generating payloads.
```
