### 1. `vertical-slice.md`
***
```markdown
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
```
***

### 2. `hexagonal-boundaries.md`
***
```markdown
# Hexagonal Architecture (Ports & Adapters)

Your core business logic must be isolated from external infrastructure (Payment Gateways like Payzone, CRMs, Third-party APIs). 

## The Core Rule: Dependency Inversion
The core defines the *Interface* (the Port). The infrastructure implements the *Adapter*. The core NEVER imports an external SDK or makes direct HTTP calls.

### DO / DON'T

| DO (Ports & Adapters) | DON'T (Tight Coupling) | Why |
|---|---|---|
| `PaymentGatewayInterface::charge()` | `PayzoneSDK::charge()` | If Payzone changes its API, you only update the Adapter, not the core business logic. |
| Inject the interface via constructor | Call `Http::post()` inside an Action | Makes the Action 100% unit-testable without mocking HTTP facades. |
| Marry your database/framework | Build a "Repository Pattern" for Eloquent/Convex | Total isolation from the DB is an academic myth. You chose Laravel/Convex. Use their ORM features natively. Isolate *external APIs*, not your primary database. |

## The Implementation Pattern

### 1. The Port (Inside the Core / Feature)
Define what the feature *needs* to happen, without caring *how* it happens.

```php
// app/Features/Checkout/Contracts/PaymentGateway.php
interface PaymentGateway {
    public function charge(int $amountInCents, string $token): string;
}
```

### 2. The Core Logic (Inside the Feature)
The action only knows about the interface. It doesn't know what HTTP is.

```php
// app/Features/Checkout/ProcessCheckoutAction.php
readonly class ProcessCheckoutAction {
    public function __construct(private PaymentGateway $gateway) {}

    public function execute(OrderData $data): void {
        // Core logic doesn't care if this is Stripe, Payzone, or a Mock.
        $transactionId = $this->gateway->charge($data->amount, $data->token);
    }
}
```

### 3. The Adapter (Outside the Core / Infrastructure)
This is the ONLY place the third-party SDK or HTTP call exists.

```php
// app/Infrastructure/Payment/PayzoneAdapter.php
class PayzoneAdapter implements PaymentGateway {
    public function charge(int $amountInCents, string $token): string {
        $response = Http::post(env('PAYZONE_URL'), [...]);
        if ($response->failed()) throw new PaymentFailedException();
        return $response->json('transaction_ref');
    }
}
```

## The Edge Case: Framework Bleed
**Rule:** Do not over-engineer this. You do not need Hexagonal Architecture for a basic CRUD operation. Reserve this pattern STRICTLY for external system integrations (Payments, SMS, Webhooks, CRMs). If you build an interface for `User::create()`, you are violating this skill and wasting time.
```
