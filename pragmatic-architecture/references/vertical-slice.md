# Vertical Slice Architecture

Stop grouping code by technical layers (e.g., global `Controllers/`, `Services/`, `Models/`). Group code by business capability. If you delete a feature, you should only have to delete one folder.

## The Core Rule: Cohesion over Separation

Code that changes together, lives together. A Vertical Slice contains the Route, the Controller/Action, the Validation (DTO), and the Query/Mutation for a single feature in one localized directory.

### DO / DON'T

| DO (Vertical Slice) | DON'T (Horizontal Layers) | Why |
|---|---|---|
| `app/Features/Checkout/` | `app/Http/Controllers/CheckoutController.php` | Locality of behavior. You shouldn't navigate 5 directories to understand how Checkout works. |
| Keep DTOs inside the feature folder | Put all DTOs in a global `app/DTOs/` folder | DTOs are usually strictly bound to one specific action. |
| Share code ONLY when 3+ features need it | Extract "shared" logic pre-emptively | Premature abstraction creates coupling. Copy-pasting is better than the wrong abstraction. |

## Implementation: Laravel

Instead of standard MVC folders, create a `Features` directory.

```php
// app/Features/ProcessPayment/
├── ProcessPaymentController.php   // The HTTP entrypoint
├── ProcessPaymentAction.php       // The core business logic
├── PaymentPayloadData.php         // The strictly typed DTO (PHP 8.5)
└── PaymentFailedException.php     // Feature-specific exceptions
```

## Implementation: Next.js / React

Do not dump everything into a global `components/` folder. Use a `features/` directory.

```text
// src/features/checkout/
├── components/
│   ├── CheckoutForm.tsx
│   └── OrderSummary.tsx
├── actions/
│   └── submitOrder.ts             // Server Actions specific to checkout
└── types.ts                       // Zod schemas for checkout
```

## The Edge Case: Shared Logic

If `Checkout` and `Subscription` both need to send an email, where does the email logic go?
**Rule:** Push it down into a `Core` or `Shared` slice. But DO NOT do this until the *third* time you need it. Embrace duplication until the pattern is undeniable. The wrong abstraction is far worse than duplicated code.