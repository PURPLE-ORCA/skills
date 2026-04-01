# Database Schema for PayZone Integration

## Recommended Schema Design

This schema supports booking/payment workflows with PayZone integration. It's designed for Convex but can be adapted for any database.

## Core Tables

### 1. Bookings Table

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  bookings: defineTable({
    // Core booking info
    bookingReference: v.string(),  // Unique, human-readable (e.g., "BK-2024-001234")
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.string(),
    
    // Booking details (adapt to your domain)
    itemType: v.union(
      v.literal("travel"),
      v.literal("stay"),
      v.literal("activity"),
      v.literal("omra")
    ),
    itemId: v.string(),  // Reference to travel pack, stay, etc.
    
    // Dates
    checkIn: v.optional(v.number()),  // Unix timestamp
    checkOut: v.optional(v.number()),
    travelDate: v.optional(v.string()),
    
    // Participants
    adults: v.number(),
    children611: v.optional(v.number()),
    children25: v.optional(v.number()),
    
    // Payment block (see detailed structure below)
    payment: v.object({
      status: v.union(
        v.literal("pending"),      // Initial state
        v.literal("processing"),   // User on PayZone page
        v.literal("paid"),         // Webhook confirmed
        v.literal("failed"),       // Payment failed
        v.literal("cancelled"),    // User cancelled
        v.literal("refunded")      // Admin refunded
      ),
      isPaid: v.boolean(),
      method: v.optional(v.union(
        v.literal("carte_bancaire"),
        v.literal("virement"),
        v.literal("agence"),
        v.literal("wafacash"),
        v.literal("cash")
      )),
      totalPrice: v.number(),        // Total amount due
      depositAmount: v.optional(v.number()),  // Amount paid (full for PayZone)
      
      // PayZone specific
      payzoneTransactionId: v.optional(v.string()),
      payzoneChargeId: v.optional(v.string()),
      
      // Timestamps
      initiatedAt: v.optional(v.number()),  // When user went to PayZone
      paidAt: v.optional(v.number()),       // When webhook confirmed
      
      // Raw webhook data (for debugging)
      lastWebhookData: v.optional(v.string()),
    }),
    
    // Status
    status: v.union(
      v.literal("draft"),        // Being created
      v.literal("confirmed"),    // Paid or alternative payment arranged
      v.literal("cancelled"),    // Cancelled by user or admin
      v.literal("completed")     // Trip/service completed
    ),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    notes: v.optional(v.string()),
    
    // Indexes for common queries
  })
    .index("by_bookingReference", ["bookingReference"])
    .index("by_status", ["status"])
    .index("by_payment_status", ["payment.status"])
    .index("by_customerEmail", ["customerEmail"])
    .index("by_createdAt", ["createdAt"]),
});
```

### 2. Payment Audit Log (Optional but Recommended)

```typescript
paymentLogs: defineTable({
  bookingId: v.id("bookings"),
  action: v.union(
    v.literal("initiated"),     // User clicked "Pay with Card"
    v.literal("redirected"),    // User sent to PayZone
    v.literal("webhook_received"),
    v.literal("success_confirmed"),
    v.literal("failed"),
    v.literal("cancelled"),
    v.literal("retried")
  ),
  timestamp: v.number(),
  details: v.optional(v.string()),  // JSON string of relevant data
  ipAddress: v.optional(v.string()),
  userAgent: v.optional(v.string()),
})
  .index("by_bookingId", ["bookingId"])
  .index("by_timestamp", ["timestamp"]),
```

## Internal Functions

### 1. Get Booking by Reference

```typescript
// convex/bookings.ts
import { internalQuery } from "./_generated/server";

export const getBookingByReference = internalQuery({
  args: { bookingReference: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("bookings"),
      _creationTime: v.number(),
      bookingReference: v.string(),
      payment: v.object({
        status: v.string(),
        isPaid: v.boolean(),
        totalPrice: v.number(),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookings")
      .withIndex("by_bookingReference", (q) =>
        q.eq("bookingReference", args.bookingReference)
      )
      .unique();
  },
});
```

### 2. Process PayZone Success

```typescript
// convex/bookings.ts
import { internalMutation } from "./_generated/server";

export const processPayzoneSuccess = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    payzoneTransactionId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    
    if (!booking) {
      console.error("Booking not found:", args.bookingId);
      return false;
    }
    
    // Idempotency: Don't process if already paid
    if (booking.payment.isPaid) {
      console.log("Booking already paid, skipping:", args.bookingId);
      return true;
    }
    
    // Update payment status
    await ctx.db.patch(args.bookingId, {
      status: "confirmed",
      payment: {
        ...booking.payment,
        status: "paid",
        isPaid: true,
        depositAmount: booking.payment.totalPrice, // Full amount paid
        payzoneTransactionId: args.payzoneTransactionId,
        paidAt: Date.now(),
      },
      updatedAt: Date.now(),
    });
    
    // Optional: Create audit log
    await ctx.db.insert("paymentLogs", {
      bookingId: args.bookingId,
      action: "success_confirmed",
      timestamp: Date.now(),
      details: JSON.stringify({
        payzoneTransactionId: args.payzoneTransactionId,
      }),
    });
    
    // Optional: Send confirmation email
    // await ctx.scheduler.runAfter(0, internal.emails.sendConfirmation, { ... });
    
    return true;
  },
});
```

### 3. Create Booking with Payment

```typescript
// convex/bookings.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    // ... your booking fields
    totalPrice: v.number(),
    paymentMethod: v.string(),
  },
  returns: v.object({
    bookingId: v.id("bookings"),
    bookingReference: v.string(),
  }),
  handler: async (ctx, args) => {
    // Generate unique booking reference
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const bookingReference = `BK-${new Date().getFullYear()}-${String(random).padStart(6, "0")}`;
    
    const bookingId = await ctx.db.insert("bookings", {
      bookingReference,
      // ... other fields from args
      payment: {
        status: "pending",
        isPaid: false,
        method: args.paymentMethod,
        totalPrice: args.totalPrice,
        depositAmount: 0,
      },
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    
    return { bookingId, bookingReference };
  },
});
```

## Data Flow Examples

### Successful PayZone Payment

```
1. User creates booking
   payment.status: "pending"
   payment.isPaid: false

2. User selects "carte_bancaire" and clicks Confirm
   → Next.js calls initiatePayzonePayment()
   → User redirected to PayZone
   
3. User completes payment on PayZone
   → PayZone redirects user to successUrl
   → PayZone sends webhook to Convex

4. Webhook received
   payment.status: "paid"
   payment.isPaid: true
   payment.payzoneTransactionId: "txn_xxx"
   payment.paidAt: 1704067200000
   status: "confirmed"
```

### Failed Payment

```
1. User on PayZone page
   payment.status: "processing"

2. Payment fails (declined card)
   → PayZone redirects to failureUrl
   → PayZone may send webhook (depends on failure type)

3. User returns to app
   payment.status: "failed" (if webhook received)
   OR
   payment.status: "processing" → timeout → "failed"
```

## Best Practices

### 1. Always Check Idempotency

```typescript
// In webhook handler
if (booking.payment.isPaid) {
  return { status: 'OK' }; // Already processed
}
```

### 2. Never Trust Frontend Alone

```typescript
// Bad: Marking paid based on URL param
if (searchParams.get('status') === 'success') {
  await markAsPaid(); // Vulnerable!
}

// Good: Only webhook marks as paid
// Frontend just shows "checking payment status..."
```

### 3. Handle Partial Payments

For deposits:
```typescript
if (booking.payment.depositAmount < booking.payment.totalPrice) {
  // Still owes money
  await sendReminderEmail(booking);
}
```

### 4. Audit Everything

Log every payment action:
- Who initiated
- When
- From what IP
- What was the result

### 5. Graceful Degradation

If PayZone is down:
- Fall back to alternative payment methods
- Queue webhooks for retry
- Notify admin of issues

## Query Examples

### Get Unpaid Bookings

```typescript
const unpaid = await ctx.db
  .query("bookings")
  .withIndex("by_payment_status", (q) =>
    q.eq("payment.status", "pending")
  )
  .filter((q) => q.lt(q.field("createdAt"), Date.now() - 24 * 60 * 60 * 1000))
  .collect();
```

### Daily Revenue Report

```typescript
const today = await ctx.db
  .query("bookings")
  .withIndex("by_payment_status", (q) =>
    q.eq("payment.status", "paid")
  )
  .filter((q) => q.gte(q.field("payment.paidAt"), startOfDay))
  .collect();

const revenue = today.reduce((sum, b) => sum + b.payment.depositAmount, 0);
```
