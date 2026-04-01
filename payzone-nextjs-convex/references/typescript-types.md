# PayZone TypeScript Types

## Core Types

Copy these types into your project's `types/payzone.ts` file for type safety across frontend and backend.

```typescript
// types/payzone.ts

/**
 * PayZone payment payload sent from Next.js to PayZone
 * This is the exact structure PayZone expects
 */
export interface PayZonePayload {
  /** Your PayZone merchant account ID */
  merchantAccount: string;
  
  /** Unix timestamp in seconds */
  timestamp: number;
  
  /** PayZone skin/theme to use */
  skin: "vps-1-vue";
  
  /** Unique customer identifier */
  customerId: string;
  
  /** ISO country code (e.g., "MA" for Morocco) */
  customerCountry: string;
  
  /** Locale for PayZone UI (e.g., "fr_FR", "ar_MA") */
  customerLocale: string;
  
  /** Unique charge identifier (typically timestamp) */
  chargeId: string;
  
  /** Your internal order/booking reference */
  orderId: string;
  
  /** Amount as string (PayZone requirement) */
  price: string;
  
  /** ISO currency code (e.g., "MAD") */
  currency: string;
  
  /** Description shown to user in PayZone */
  description: string;
  
  /** Payment flow mode */
  mode: "DEEP_LINK";
  
  /** Payment method type */
  paymentMethod: "CREDIT_CARD";
  
  /** Whether to show saved payment profiles */
  showPaymentProfiles: "true" | "false";
  
  /** Webhook URL (server-to-server) - points to Convex */
  callbackUrl: string;
  
  /** Success redirect URL (user-facing) */
  successUrl: string;
  
  /** Failure redirect URL (user-facing) */
  failureUrl: string;
  
  /** Cancel redirect URL (user-facing) */
  cancelUrl: string;
}

/**
 * Response from initiatePayzonePayment Server Action
 */
export interface PayZoneInitResponse {
  /** Stringified JSON payload */
  payload: string;
  
  /** SHA-256 signature of payload */
  signature: string;
  
  /** PayZone payment page URL */
  payzoneUrl: string;
}

/**
 * Individual transaction within a PayZone webhook
 */
export interface PayZoneTransaction {
  /** Transaction state */
  state: "APPROVED" | "DECLINED" | "PENDING" | "ERROR";
  
  /** Result code (0 = success) */
  resultCode: number;
  
  /** Gateway-provided transaction ID */
  gatewayProvidedId?: string;
  
  /** Transaction timestamp */
  timestamp?: string;
  
  /** Amount charged */
  amount?: number;
  
  /** Currency code */
  currency?: string;
}

/**
 * Full webhook payload received from PayZone
 */
export interface PayZoneWebhookPayload {
  /** Overall payment status */
  status: "CHARGED" | "PENDING" | "FAILED" | "CANCELLED";
  
  /** Your order reference */
  orderId: string;
  
  /** PayZone payment ID */
  id: string;
  
  /** Transaction history */
  transactions: PayZoneTransaction[];
  
  /** Total amount */
  totalPrice?: number;
  
  /** Currency */
  currency?: string;
  
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Simplified PayZone data for React components
 */
export interface PayzoneData {
  payload: string;
  signature: string;
  payzoneUrl: string;
}

/**
 * Parameters for initiating PayZone payment
 */
export interface PayzoneParams {
  bookingReference: string;
  amount: number;
  description: string;
}

/**
 * Payment status in your database
 */
export type PaymentStatus = 
  | "pending"      // Initial state
  | "processing"   // User on PayZone page
  | "paid"         // Webhook confirmed payment
  | "failed"       // Payment failed
  | "cancelled"    // User cancelled
  | "refunded";    // Payment refunded

/**
 * Payment object stored in database
 */
export interface PaymentDetails {
  /** Current status */
  status: PaymentStatus;
  
  /** Whether payment is complete */
  isPaid: boolean;
  
  /** PayZone transaction ID */
  payzoneTransactionId?: string;
  
  /** Total amount to be paid */
  totalPrice: number;
  
  /** Amount already paid (for partial payments) */
  depositAmount?: number;
  
  /** Payment method used */
  method?: "carte_bancaire" | "virement" | "agence" | "wafacash" | "cash";
  
  /** When payment was initiated */
  initiatedAt?: number;
  
  /** When payment was completed */
  paidAt?: number;
  
  /** Webhook payload (for debugging) */
  webhookData?: PayZoneWebhookPayload;
}

/**
 * Environment variables type safety
 */
export interface PayZoneEnvVars {
  /** Next.js */
  PAYZONE_MERCHANT_ACCOUNT: string;
  PAYZONE_SECRET_KEY: string;
  PAYZONE_URL: string;
  NEXT_PUBLIC_APP_URL: string;
  CONVEX_HTTP_URL: string;
  
  /** Convex */
  PAYZONE_NOTIFICATION_KEY: string;
}
```

## Usage Examples

### In Server Action

```typescript
// actions/payzone.ts
"use server";

import type { PayZonePayload, PayZoneInitResponse } from "@/types/payzone";

export async function initiatePayzonePayment(
  bookingReference: string,
  amount: number,
  description: string
): Promise<PayZoneInitResponse> {
  const payload: PayZonePayload = {
    // ... all required fields
  };
  
  // TypeScript ensures all required fields are present
}
```

### In Webhook Handler

```typescript
// convex/http.ts
import type { PayZoneWebhookPayload } from "../types/payzone";

http.route({
  path: "/payzone/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const data: PayZoneWebhookPayload = await request.json();
    
    // TypeScript knows data has orderId, status, transactions, etc.
    const approvedTx = data.transactions?.find(
      (tx) => tx.state === "APPROVED" && tx.resultCode === 0
    );
  }),
});
```

### In React Components

```typescript
// components/PayzoneRedirect.tsx
import type { PayzoneData } from "@/types/payzone";

interface Props {
  payzoneData: PayzoneData;
}
```

## Type Guards

Use these to safely narrow types at runtime:

```typescript
// types/payzone.ts

export function isPayZoneWebhookPayload(
  data: unknown
): data is PayZoneWebhookPayload {
  return (
    typeof data === "object" &&
    data !== null &&
    "status" in data &&
    "orderId" in data &&
    Array.isArray((data as PayZoneWebhookPayload).transactions)
  );
}

export function isSuccessfulTransaction(
  tx: PayZoneTransaction
): boolean {
  return tx.state === "APPROVED" && tx.resultCode === 0;
}
```

## Database Schema Integration

When using with Convex, you can use these types with your schema:

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  bookings: defineTable({
    // ... other fields
    payment: v.object({
      status: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("paid"),
        v.literal("failed"),
        v.literal("cancelled"),
        v.literal("refunded")
      ),
      isPaid: v.boolean(),
      payzoneTransactionId: v.optional(v.string()),
      totalPrice: v.number(),
      depositAmount: v.optional(v.number()),
      method: v.optional(v.string()),
      initiatedAt: v.optional(v.number()),
      paidAt: v.optional(v.number()),
    }),
  }),
});
```
