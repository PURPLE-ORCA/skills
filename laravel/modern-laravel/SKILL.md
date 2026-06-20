---
name: modern-laravel
description: 
  Modern Laravel 12 and PHP 8.4/8.5 best practices, architectural patterns, and syntax. Use when writing, reviewing, or refactoring Laravel backend code. Triggers on "laravel 12", "php 8.5", "refactor controller", "modernize laravel", "eloquent builder", "concurrency facade", "property hooks", or "pipe operator". MUST use this skill to prevent legacy MVC anti-patterns, fat controllers, and outdated PHP syntax.
---

# Modern Laravel (v12.x / PHP 8.5) Complete Guide

This skill enforces strict modern Laravel architecture. The ecosystem has moved past dumping business logic into Controllers and passing associative arrays around. If your code relies on `protected $casts`, manual getters/setters, or blocking synchronous external API calls, it is legacy.

Every section follows: **what it is** → **DO this** → **DON'T do that** → **migration path**.

## Critical DO / DON'T Quick Reference

| DO (Modern Laravel 12 / PHP 8.5) | DON'T (Legacy/Anti-pattern) | Why |
|---|---|---|
| `public private(set) string $status;` | `protected string $status; public function getStatus()` | PHP 8.4 asymmetric visibility kills getter boilerplate. |
| `$data \|> process() \|> save();` | `save(process($data));` | PHP 8.5 pipe operator makes sequential transformations readable. |
| `Concurrency::run([fn() => api1(), fn() => api2()])` | Awaiting slow external HTTP calls sequentially | Concurrency facade drops response times by running tasks in parallel. |
| `#[UseEloquentBuilder(OrderBuilder::class)]` | Overriding `newEloquentBuilder($query)` on Models | Laravel 12 native attribute is cleaner and IDE-friendly. |
| Custom Query Builders for domain logic | Local scopes (`scopeActive($query)`) | Local scopes bloat the Model. Builders keep Eloquent chainable and isolated. |
| Single Action classes (`ProcessPayment::execute()`) | Fat Controllers with 500 lines of business logic | Controllers are HTTP routers. They should not know *how* to process a payment. |
| Native PHP `array_first()`, `array_find()` | `collect($arr)->first()` for simple arrays | PHP 8.4+ handles this natively; no need to boot up the Collection engine for basic arrays. |
| `Context::add('payment_id', $id);` | Passing `$paymentId` through 5 layers of method arguments | The Context facade automatically shares data across logs, queues, and the current request. |

---

## The Syntax Revolution (PHP 8.4 & 8.5)

### 1. Asymmetric Visibility & Property Hooks
**What it is:** PHP 8.4 introduced the ability to define different visibilities for reading and writing properties. You no longer need to write a 10-line getter method just to protect a property from being mutated outside the class.

```php
// ---- DON'T: The 2020 Way ----
class PaymentGateway {
    protected string $transactionId;
    
    public function getTransactionId(): string {
        return $this->transactionId;
    }
}

// ---- DO: The 2026 Way ----
class PaymentGateway {
    public private(set) string $transactionId;
    
    public function __construct(string $transactionId) {
        $this->transactionId = $transactionId; // Allowed internally
    }
}
// $gateway->transactionId = 'new'; // Fatal Error: Cannot write
// echo $gateway->transactionId;    // Works perfectly
```

### 2. The Pipe Operator (`|>`)
**What it is:** PHP 8.5 allows you to pipe the result of one expression directly into the next. It eliminates nested function calls and temporary variables.

```php
// ---- DON'T: Nested hell or temporary variables ----
$validated = sanitize_input($request->input('payload'));
$parsed = parse_payment_data($validated);
$result = process_transaction($parsed);

// ---- DO: PHP 8.5 Pipe Operator ----
$result = $request->input('payload') 
    |> sanitize_input(...) 
    |> parse_payment_data(...) 
    |> process_transaction(...);
```

---

## Laravel 12 Architecture (Stop Writing 2020 Code)

### 1. Concurrency Facade (Parallel Processing)
**What it is:** Laravel natively supports running closures in parallel using `ext-parallel` or `pcntl`. If you are hitting multiple slow APIs (like a payment gateway, a CRM, and an email service) during a single request, do not run them sequentially.

```php
// ---- DON'T: Synchronous Blocking (Slow) ----
public function checkout(Order $order) {
    $payment = Http::post('[https://api.payzone.ma/charge](https://api.payzone.ma/charge)', $order->data); // Waits 500ms
    $crm = Http::post('[https://crm.local/sync](https://crm.local/sync)', $order->data); // Waits 400ms
    // Total time: 900ms
}

// ---- DO: Laravel Concurrency (Fast) ----
use Illuminate\Support\Facades\Concurrency;

public function checkout(Order $order) {
    [$payment, $crm] = Concurrency::run([
        fn () => Http::post('[https://api.payzone.ma/charge](https://api.payzone.ma/charge)', $order->data),
        fn () => Http::post('[https://crm.local/sync](https://crm.local/sync)', $order->data),
    ]);
    // Total time: 500ms (Bottlenecked only by the slowest request)
}
```

### 2. Dedicated Eloquent Builders via Attributes
**What it is:** Bloating your Model with 15 different `scopeSomething()` methods makes it impossible to read. Extract queries to a custom Builder. In Laravel 12, wire it up using the `#[UseEloquentBuilder]` attribute instead of overriding core model methods.

```php
// ---- DON'T: Bloated Models with Local Scopes ----
class Order extends Model {
    public function scopeCompleted($query) {
        return $query->where('status', 'completed');
    }
    public function scopeHighValue($query) {
        return $query->where('total', '>', 5000);
    }
}

// ---- DO: Custom Builders with Attributes ----
use Illuminate\Database\Eloquent\Attributes\UseEloquentBuilder;

#[UseEloquentBuilder(OrderBuilder::class)]
class Order extends Model {
    // Model stays perfectly clean.
}

class OrderBuilder extends Builder {
    public function completed(): self {
        return $this->where('status', 'completed');
    }
    public function highValue(): self {
        return $this->where('total', '>', 5000);
    }
}
// Usage: Order::query()->completed()->highValue()->get();
```

---

## The "Fat Controller" Antipattern

If your controller method is longer than 15 lines, you are doing it wrong. Controllers have exactly three jobs:
1. Receive the HTTP Request (Validation via FormRequests).
2. Dispatch the logic to an Action or UseCase.
3. Return the HTTP Response (or Inertia render).

### How to Refactor to Actions

```php
// ---- DON'T: The Fat Controller ----
public function store(Request $request) {
    $request->validate([...]);
    
    $user = User::create($request->all());
    
    if ($request->hasFile('avatar')) {
        $path = $request->file('avatar')->store('avatars');
        $user->update(['avatar' => $path]);
    }
    
    Mail::to($user)->send(new WelcomeEmail());
    
    return redirect()->route('dashboard');
}

// ---- DO: The Modern Action Pattern ----
// Controller:
public function store(RegisterUserRequest $request, RegisterUserAction $action) {
    $action->execute($request->validated(), $request->file('avatar'));
    return redirect()->route('dashboard');
}

// Action Class (app/Actions/RegisterUserAction.php):
class RegisterUserAction {
    public function execute(array $data, ?UploadedFile $avatar): User {
        return DB::transaction(function () use ($data, $avatar) {
            $user = User::create($data);
            
            if ($avatar) {
                $user->update(['avatar' => $avatar->store('avatars')]);
            }
            
            Mail::to($user)->send(new WelcomeEmail());
            
            return $user;
        });
    }
}
``` 

## State Tracking & Context (Laravel 12)

### 1. The Context Facade
**What it is:** Laravel tracks contextual data automatically across logs, queues, and HTTP requests. You no longer need to pass a `$transactionId` or `$tenantId` down through 8 layers of method arguments just so a background queued job can log it.

```php
// ---- DON'T: Prop Drilling Data ----
class PaymentController {
    public function process(Request $request, PaymentProcessor $processor) {
        // Passing ID to processor, which passes it to the logger, which passes it to a job...
        $processor->execute($request->all(), $request->user()->id); 
    }
}

// ---- DO: Laravel Context Facade ----
use Illuminate\Support\Facades\Context;

class PaymentController {
    public function process(Request $request, PaymentProcessor $processor) {
        // Added once at the boundary. Available everywhere.
        Context::add('user_id', $request->user()->id);
        Context::add('transaction_ref', Str::uuid());
        
        $processor->execute($request->validated());
    }
}

class ProcessPaymentJob implements ShouldQueue {
    public function handle() {
        // The Job automatically inherits the Context from the Request that dispatched it.
        // If this throws an exception, 'user_id' is already attached to the log/Sentry.
        Log::info('Processing payment...'); 
    }
}
```

## Data Transfer Objects (DTOs) vs. Array Shapes

### 1. Native PHP DTOs
**What it is:** Stop passing associative arrays (`$data = ['id' => 1, 'status' => 'paid']`) between layers. Associative arrays lack autocomplete, static analysis, and type safety. With PHP 8.4/8.5 constructor property promotion and `readonly` classes, writing a DTO takes 10 seconds.

```php
// ---- DON'T: The Array Shape (No Type Safety) ----
public function processOrder(array $orderData) {
    // Is it $orderData['total'] or $orderData['amount']? 
    // Is it an integer in cents or a float? Who knows.
    $amount = $orderData['amount']; 
}

// ---- DO: Readonly DTOs ----
readonly class OrderData {
    public function __construct(
        public string $transactionId,
        public int $amountInCents,
        public string $currency = 'MAD'
    ) {}
    
    // Optional: Add a named constructor to build it from a Laravel Request
    public static function fromRequest(Request $request): self {
        return new self(
            $request->input('tx_id'),
            (int) ($request->input('amount') * 100)
        );
    }
}

public function processOrder(OrderData $data) {
    // Fully typed, IDE auto-completes, impossible to mutate accidentally.
    $amount = $data->amountInCents;
}
```

## Pest v3 Architectural Enforcement

**What it is:** A codebase standard is useless if it isn't enforced. Pest v3 allows you to write "Arch Tests" that scan your codebase and instantly fail the build if someone violates your rules. If you agreed to kill "Fat Controllers" and "Local Scopes," you write a test for it.

### 1. Strict Layer Isolation

```php
// tests/ArchTest.php

// ---- 1. Kill Fat Controllers ----
// Controllers should not hit the database directly or use Models.
// They must use Actions, Services, or Repositories.
test('controllers do not contain business logic')
    ->expect('App\Http\Controllers')
    ->not->toUse('App\Models')
    ->ignoring('App\Http\Controllers\Auth');

// ---- 2. Enforce Action Single Responsibility ----
// Actions should only have one public method (usually handle() or execute())
test('actions use single responsibility')
    ->expect('App\Actions')
    ->toHaveMethod('execute');

// ---- 3. Ban Legacy PHP Functions ----
// Stop people from using slow or insecure core PHP functions when Laravel helpers exist.
test('ban legacy php functions')
    ->expect(['dd', 'dump', 'env', 'die', 'var_dump'])
    ->not->toBeUsed();

// ---- 4. Enforce Strict Types ----
test('everything uses strict types')
    ->expect('App')
    ->toUseStrictTypes();
```

## Migration Checklist for Legacy Laravel Apps
1. Upgrade PHP to 8.5 and Laravel to 12.x.
2. Run `composer require pestphp/pest --dev` and configure Arch tests to lock down your directories.
3. Search codebase for `scope*` methods in Models. Extract them to custom Builders using `#[UseEloquentBuilder]`.
4. Search for deep array passing (`function process(array $data)`). Replace with native `readonly` DTO classes.
5. Identify sequential external API calls. Wrap them in `Concurrency::run()`.
6. Remove manual boilerplate getters/setters and replace with PHP 8.4 `public private(set)`.
7. Move repetitive logging/tracking IDs into the `Context` facade middleware.
```
