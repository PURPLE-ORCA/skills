---
name: payzone-nextjs-convex
description: Use when integrating the PayZone Morocco Hosted Payment Page (vps-1-vue) in a Next.js App Router frontend with a Convex backend. Provides precise patterns for SHA-256 payload encryption, Web Crypto HMAC-SHA256 edge webhook verification, and bypassing the V8 Edge runtime traps.
---

# PayZone Morocco Integration (Next.js + Convex)

This skill provides the exact architecture to bridge PayZone's legacy PHP-era payment gateway with a modern serverless stack, completely bypassing PCI compliance liabilities via a Hosted Paywall model.

## Core Architecture Flow

1. **Outbound (Next.js Server Action):** Generate a cryptographically signed checkout payload using standard Node APIs.
2. **Handoff (React Client):** Auto-submit the payload to PayZone via a hidden HTML form, ejecting the user from the app.
3. **Inbound (Convex HTTP Router):** Intercept the webhook on the Edge runtime, verify the signature using native Web Crypto, and mutate the database.

## Implementation References

Do not attempt to write the webhook or payload logic from scratch. Pull from these specific references based on the layer being built:

### Essential References (Start Here)

* **Environment Variables:** See [references/environment-variables.md](references/environment-variables.md). Critical distinction between `PAYZONE_SECRET_KEY` (for payload signing) and `PAYZONE_NOTIFICATION_KEY` (for webhook verification). Common source of "Invalid signature" errors.

* **Backend Webhook (Convex):** See [references/edge-webhook.md](references/edge-webhook.md). Contains the mandatory W3C Web Crypto implementation. Convex HTTP routers run on V8 Edge; importing Node's `crypto` here will cause a fatal build error. Includes the logic to parse nested `resultCode === 0` statuses.

* **Frontend Server Action (Next.js):** See [references/nextjs-payload.md](references/nextjs-payload.md). Contains the Node `crypto` SHA-256 hashing logic and critical environment variable mapping (specifically routing `callbackUrl` to the Convex `.site` domain, not localhost).

### Integration Patterns

* **React Hook Pattern:** See [references/react-hook-pattern.md](references/react-hook-pattern.md). Centralizes PayZone logic in a reusable hook, eliminating code duplication across multiple booking flows. Shows how to configure the hook with just 3 callbacks instead of managing state in every component.

* **TypeScript Types:** See [references/typescript-types.md](references/typescript-types.md). Complete type definitions for payloads, webhooks, and database schemas. Use these to ensure type safety across frontend and backend.

* **Database Schema:** See [references/database-schema.md](references/database-schema.md). Recommended Convex schema for bookings and payments, including webhook audit logs and idempotency patterns.

### UI Components

* **Redirect Component:** See [assets/PayzoneRedirect.tsx](assets/PayzoneRedirect.tsx). Enhanced version with error handling, retry logic, internationalization support (FR/AR/EN), and debug information for development.

### Operations

* **Testing Protocol:** See [references/sandbox-testing.md](references/sandbox-testing.md). Official dummy card credentials and database verification steps.

* **Production Deployment:** See [references/production-deployment.md](references/production-deployment.md). Complete checklist for going live, including security hardening, monitoring setup, and rollback procedures.

* **Troubleshooting:** See [references/troubleshooting.md](references/troubleshooting.md). Diagnostic flowchart for common issues (signature failures, webhook problems, duplicate payments) with copy-paste debug code.

## Quick Start

### 1. Set Up Environment Variables

```bash
# .env.local (Next.js)
PAYZONE_MERCHANT_ACCOUNT=your_merchant_id
PAYZONE_SECRET_KEY=sk_xxxxxxxxxxxxxxxx
PAYZONE_URL=https://payzone.ma/api/payment
NEXT_PUBLIC_APP_URL=https://yourapp.com
CONVEX_HTTP_URL=https://your-project.convex.site

# Convex Dashboard (Settings → Environment Variables)
PAYZONE_NOTIFICATION_KEY=nk_xxxxxxxxxxxxxxxx
```

**⚠️ Critical:** `SECRET_KEY` ≠ `NOTIFICATION_KEY`. See environment-variables.md for details.

### 2. Implement Server Action

```typescript
// actions/payzone.ts
"use server";

import { createHash } from "crypto";
import type { PayZoneInitResponse } from "@/types/payzone";

export async function initiatePayzonePayment(
  bookingReference: string,
  amount: number,
  description: string
): Promise<PayZoneInitResponse> {
  // Implementation in references/nextjs-payload.md
}
```

### 3. Configure Hook in Component

```typescript
const flow = useBookingFlow<BookingFormData>({
  // ... other config
  
  // PayZone Integration (3 lines!)
  isPayzonePayment: (formData) => formData.paymentMethod === "carte_bancaire",
  getPayzoneTotalPrice: (formData) => computeTotalPrice(formData),
  getPayzoneDescription: (_, ref) => `Réservation #${ref}`,
});
```

### 4. Handle Webhook

```typescript
// convex/http.ts
http.route({
  path: '/payzone/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    // Implementation in references/edge-webhook.md
  }),
});
```

## Common Pitfalls

1. **Wrong Crypto API:** Using Node's `crypto` in Convex Edge (must use Web Crypto)
2. **Wrong Key:** Using `SECRET_KEY` for webhook verification (must use `NOTIFICATION_KEY`)
3. **Localhost Webhook:** PayZone can't reach `localhost` (use production Convex URL or ngrok)
4. **Missing Idempotency:** Database mutated multiple times for same payment (see database-schema.md)
5. **Trusting Frontend:** Marking paid based on URL params instead of webhooks (security risk)

## Testing

Use these official PayZone sandbox credentials:

- **Card:** 4111 1111 1111 1111
- **Expiry:** 12/30
- **CVV:** 000
- **Name:** Any text

Never trust the success page alone. Always verify webhook received and database updated. See references/sandbox-testing.md for full protocol.

## Support

If stuck:
1. Check [references/troubleshooting.md](references/troubleshooting.md)
2. Review environment-variables.md for key confusion
3. Enable debug logging (see troubleshooting.md)
4. Contact PayZone support with merchant ID and timestamps
