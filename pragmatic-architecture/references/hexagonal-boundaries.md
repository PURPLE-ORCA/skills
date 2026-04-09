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