# PayZone Troubleshooting Guide

## Quick Diagnosis Flowchart

```
Problem: Payment not working
│
├─→ User can't get to PayZone?
│   └─→ Check Server Action (see Issue #1)
│
├─→ User on PayZone but payment fails?
│   └─→ Check test credentials (see Issue #2)
│
├─→ Payment shows success but database not updated?
│   └─→ Check Webhook (see Issue #3)
│
└─→ Webhook received but signature invalid?
    └─→ Check Environment Variables (see Issue #4)
```

---

## Issue #1: User Can't Reach PayZone

### Symptoms
- Stuck on loading spinner
- "Failed to initiate PayZone payment" error
- Form submission error in console

### Diagnosis Steps

1. **Check Server Action Error**
```bash
# Watch Next.js logs
npm run dev
# Look for errors when clicking "Confirm"
```

2. **Verify Environment Variables**
```bash
# Add this to your Server Action temporarily:
console.log("ENV CHECK:", {
  merchantAccount: process.env.PAYZONE_MERCHANT_ACCOUNT ? "✓" : "✗",
  secretKey: process.env.PAYZONE_SECRET_KEY ? "✓" : "✗",
  payzoneUrl: process.env.PAYZONE_URL ? "✓" : "✗",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ? "✓" : "✗",
  convexUrl: process.env.CONVEX_HTTP_URL ? "✓" : "✗",
});
```

3. **Check Payload Generation**
```typescript
// In actions/payzone.ts, add logging:
export async function initiatePayzonePayment(...) {
  console.log("Generating payload for:", { bookingReference, amount });
  
  const payload = { ... };
  console.log("Payload:", JSON.stringify(payload, null, 2));
  
  const signature = createHash("sha256")
    .update(secretKey + JSON.stringify(payload))
    .digest("hex");
  console.log("Signature:", signature.substring(0, 10) + "...");
  
  return { payload: JSON.stringify(payload), signature, payzoneUrl };
}
```

### Common Causes

| Error | Solution |
|-------|----------|
| "Missing required PayZone environment variables" | Set all 5 env vars in `.env.local` |
| "Cannot read property 'createHash' of undefined" | Ensure `"use server"` directive is at top of file |
| "Payload is too large" | Description field is too long (max 255 chars) |
| "Invalid merchant account" | Check `PAYZONE_MERCHANT_ACCOUNT` with PayZone support |

---

## Issue #2: PayZone Page Shows Error

### Symptoms
- "Invalid request" on PayZone
- "Merchant not found"
- "Invalid signature"

### Diagnosis Steps

1. **Verify Test Credentials**
```
Card: 4111 1111 1111 1111
Expiry: 12/30
CVV: 000
```

2. **Check Signature Algorithm**
```typescript
// This must be EXACTLY:
const signature = createHash("sha256")
  .update(SECRET_KEY + JSON.stringify(payload))
  .digest("hex");

// NOT:
.createHmac("sha256", SECRET_KEY).update(JSON.stringify(payload))
// NOT:
.createHash("sha256").update(JSON.stringify(payload) + SECRET_KEY)
```

3. **Validate Payload Structure**
PayZone is very strict about field names and types:
```typescript
// Required fields (exact names):
merchantAccount  // string
skin             // "vps-1-vue"
customerId       // string
customerCountry  // "MA"
chargeId         // string
timestamp        // number (unix seconds)
price            // string (not number!)
currency         // "MAD"
mode             // "DEEP_LINK"
paymentMethod    // "CREDIT_CARD"
```

---

## Issue #3: Database Not Updated After Payment

### Symptoms
- User sees success page
- Payment completed on PayZone
- Database still shows `isPaid: false`

### Diagnosis Steps

1. **Check Webhook Delivery**
```bash
# View Convex logs
npx convex logs

# Look for:
# POST /payzone/webhook
# Should show request received
```

2. **Test Webhook Endpoint**
```bash
curl -X POST https://your-project.convex.site/payzone/webhook \
  -H "Content-Type: application/json" \
  -H "X-Callback-Signature: test" \
  -d '{"status":"CHARGED","orderId":"test"}'

# Should return 401 (invalid signature) not 404
```

3. **Check Webhook Payload**
```typescript
// In convex/http.ts, add logging:
console.log("Webhook received:", {
  signature: request.headers.get('X-Callback-Signature'),
  bodyPreview: rawBody.substring(0, 200),
});
```

4. **Verify Status Parsing**
```typescript
// Add this debug logging:
const approvedTx = data.transactions?.find(
  (tx: any) => tx.state === 'APPROVED' && tx.resultCode === 0
);

console.log("Status check:", {
  topLevelStatus: data.status,
  transactionsCount: data.transactions?.length,
  approvedTx: approvedTx ? "Found" : "Not found",
  transactionStates: data.transactions?.map((t: any) => `${t.state}:${t.resultCode}`),
});
```

### Common Causes

| Symptom | Cause | Solution |
|---------|-------|----------|
| No webhook logs | URL wrong | Check `CONVEX_HTTP_URL` |
| 404 errors | Path wrong | Ensure `/payzone/webhook` route exists |
| 401 errors | Wrong notification key | Use `PAYZONE_NOTIFICATION_KEY` not `SECRET_KEY` |
| DB not updated | Query failing | Check `getBookingByReference` returns booking |

---

## Issue #4: Signature Verification Fails

### Symptoms
- Webhook returns 401
- "Invalid signature" in logs

### Diagnosis

1. **Verify Correct Key**
```typescript
// WRONG:
const key = process.env.PAYZONE_SECRET_KEY; // Node.js key

// CORRECT:
const key = process.env.PAYZONE_NOTIFICATION_KEY; // Webhook key
```

2. **Check Case Sensitivity**
```typescript
// Headers are case-insensitive, but let's be explicit:
const signature = request.headers.get('X-Callback-Signature');
// NOT:
const signature = request.headers.get('x-callback-signature');
```

3. **Verify Hex Encoding**
```typescript
// Ensure signature is lowercase hex:
const calculated = Array.from(new Uint8Array(signatureBuffer))
  .map(b => b.toString(16).padStart(2, '0'))
  .join('')
  .toLowerCase();

// Compare ignoring case:
if (calculated.toLowerCase() !== signatureHeader.toLowerCase()) {
  // Invalid
}
```

---

## Issue #5: Duplicate Payments

### Symptoms
- One booking, multiple `payzoneTransactionId`s
- Customer charged twice

### Solution

Implement idempotency in webhook handler:

```typescript
export const processPayzoneSuccess = internalMutation({
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    
    // CRITICAL: Check if already processed
    if (booking.payment.isPaid) {
      console.log("Already paid, skipping");
      return { status: 'OK' }; // Return success to stop retries
    }
    
    // Also check by transaction ID
    const existing = await ctx.db
      .query("bookings")
      .withIndex("by_transaction", (q) =
        q.eq("payment.payzoneTransactionId", args.payzoneTransactionId)
      )
      .first();
      
    if (existing) {
      console.log("Transaction already processed for booking:", existing._id);
      return { status: 'OK' };
    }
    
    // Process payment...
  },
});
```

---

## Issue #6: Local Development Webhooks

### Problem
PayZone can't reach `localhost:3000` or local Convex.

### Solutions

**Option 1: Use Convex Production URL**
```bash
# Even in development, point callbackUrl to production Convex
# Set in .env.local:
CONVEX_HTTP_URL="https://your-production-project.convex.site"
```

**Option 2: Use ngrok**
```bash
# Expose local Convex
npx ngrok http 3210  # Convex port

# Update CONVEX_HTTP_URL to ngrok URL temporarily
```

**Option 3: Mock Webhook (Testing Only)**
```typescript
// Add test endpoint
http.route({
  path: "/test/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Manually trigger success
    await ctx.runMutation(internal.bookings.processPayzoneSuccess, {
      bookingId: "your_test_booking_id",
      payzoneTransactionId: "test_txn_123",
    });
    return new Response("OK", { status: 200 });
  }),
});
```

---

## Issue #7: CORS Errors

### Symptoms
- Browser console shows CORS errors
- Webhook requests blocked

### Solution

**Webhooks don't need CORS** - they're server-to-server. If you're seeing CORS errors, you're testing wrong:

```bash
# ❌ Don't test webhooks from browser
curl ...  # ✓ Use curl or Postman instead
```

If your frontend is calling the webhook URL directly by mistake, fix the architecture:
- Frontend → Next.js Server Action
- PayZone → Convex HTTP Router (webhook)

---

## Debug Mode

Add this component to see real-time payment status:

```typescript
// components/DebugPaymentStatus.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex";

export function DebugPaymentStatus({ bookingId }: { bookingId: string }) {
  const booking = useQuery(api.bookings.get, { bookingId });
  
  if (!booking) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-zinc-900 p-4 rounded text-xs">
      <div>Status: {booking.status}</div>
      <div>Payment: {booking.payment.status}</div>
      <div>Is Paid: {booking.payment.isPaid ? "Yes" : "No"}</div>
      <div>Method: {booking.payment.method}</div>
      {booking.payment.payzoneTransactionId && (
        <div>TX: {booking.payment.payzoneTransactionId}</div>
      )}
    </div>
  );
}
```

---

## Getting Help

### Information to Provide

When contacting PayZone support or posting issues:

1. **Merchant Account ID** (not secret keys!)
2. **Timestamp** of failed transaction
3. **Booking Reference** (orderId)
4. **Error message** (exact text)
5. **Environment**: Sandbox or Production?
6. **Logs**: Convex webhook logs, Next.js server logs

### Contact

- PayZone Support: support@payzone.ma
- Convex Discord: https://convex.dev/community
- Next.js Issues: https://github.com/vercel/next.js/issues
