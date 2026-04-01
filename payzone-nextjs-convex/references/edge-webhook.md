# PayZone Webhook Implementation (Convex Edge)

## CRITICAL: Runtime Constraints
Convex `http.ts` routers run strictly in a V8 Edge environment. 
**Do NOT import Node's `crypto` module.** The bundler will fail immediately.
You must use the native W3C Web Crypto API (`crypto.subtle`) to calculate the HMAC-SHA256 signature.

## Payload Verification Logic
PayZone sends a POST request with an `X-Callback-Signature` header.
To verify authenticity, hash the raw text body of the request using the `PAYZONE_NOTIFICATION_KEY` environment variable and compare it to the header.

## Status Parsing Rules
Never trust the top-level `status: 'CHARGED'` field. A user failing 3D Secure multiple times before succeeding will trigger this top-level status.
You must iterate through the `transactions` array and specifically match:
1. `state === 'APPROVED'`
2. `resultCode === 0`

## Accounting Data
When updating the database after a successful transaction, ensure `depositAmount` is set to equal the `totalPrice`, as the hosted checkout charges the full amount upfront.

## Implementation Template

```typescript
import { httpRouter } from 'convex/server';
import { internal } from './_generated/api';
import { httpAction } from './_generated/server';

const http = httpRouter();

http.route({
  path: '/payzone/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('X-Callback-Signature');

    if (!signatureHeader) {
      return new Response(JSON.stringify({ status: 'KO' }), { status: 400 });
    }

    // 1. Native Edge Web Crypto HMAC-SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(process.env.PAYZONE_NOTIFICATION_KEY!);
    const messageData = encoder.encode(rawBody);

    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    
    // Convert ArrayBuffer to Hex String
    const calculatedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    if (calculatedSignature.toLowerCase() !== signatureHeader.toLowerCase()) {
      return new Response(JSON.stringify({ status: 'KO' }), { status: 401 });
    }

    const data = JSON.parse(rawBody);

    // 2. Strict Status Parsing
    if (data.status === 'CHARGED') {
      const approvedTx = data.transactions?.find(
        (tx: any) => tx.state === 'APPROVED' && tx.resultCode === 0,
      );

      if (approvedTx) {
        // 3. Database Validation & Mutation Handoff
        const booking = await ctx.runQuery(internal.bookings.getBookingByReference, {
          bookingReference: data.orderId,
        });

        if (booking) {
          await ctx.runMutation(internal.bookings.processPayzoneSuccess, {
            bookingId: booking._id,
            payzoneTransactionId: approvedTx.gatewayProvidedId || data.id,
            // Ensure emailData and depositAmount logic is handled in your mutation
          });

          return new Response(JSON.stringify({ status: 'OK' }), { status: 200 });
        }
      }
    }

    return new Response(JSON.stringify({ status: 'KO' }), { status: 200 });
  }),
});

export default http;