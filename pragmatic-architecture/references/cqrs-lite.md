### 3. `cqrs-lite.md`
Drop this into `skills/pragmatic-architecture/references/`.

***
```markdown
# CQRS Lite (Command Query Responsibility Segregation)

Stop using the exact same massive Eloquent Model or complex API route to update a user's password and to generate a 10-table joined analytics dashboard.

## The Core Rule: Separate Reads from Writes
Reads (Queries) do not mutate state. Writes (Commands/Mutations) mutate state but do not return complex data (return a success boolean or the ID, not the fully hydrated relationship tree).

### DO / DON'T

| DO (CQRS Lite) | DON'T (The CRUD Monolith) | Why |
|---|---|---|
| Use raw SQL or optimized DB Builders for dashboards | Hydrate 10,000 Eloquent Models just to count rows | ORMs are for business logic and writes. They are memory hogs for heavy reads. |
| Use Convex `mutation` strictly for writes | Do heavy data transformations inside a Convex `query` | Queries must be fast and pure for UI reactivity. |
| Return simple DTOs or raw arrays for read views | Return the full ORM Model object to the frontend | The UI doesn't need to know how to `->save()` a record; it just needs the data. |

## Implementation: Convex
Convex enforces this natively. Do not fight it.
* **Queries:** ONLY read data. Filter, map, and return. Must be deterministic.
* **Mutations:** ONLY write data. Insert, update, delete.
* **Actions:** Use ONLY when you need to call a third-party API (like Payzone), then pass the result to an internal mutation. 

## Implementation: Laravel
For basic CRUD, just use Eloquent. But when the app scales and you need a reporting dashboard, split the logic.

```php
// ---- The Write (Command) ----
// Uses the heavy ORM because we need its lifecycle hooks, validation, and domain rules.
class UpdateOrderAction {
    public function execute(string $id, OrderData $data): void {
        $order = Order::findOrFail($id);
        $order->update([...]);
        // Dispatches events, fires webhooks, etc.
    }
}

// ---- The Read (Query) ----
// Bypasses Eloquent completely. Uses the DB facade for pure speed and minimal memory footprint.
class GetDashboardStatsQuery {
    public function get(): array {
        return DB::table('orders')
            ->selectRaw('status, count(*) as total, sum(amount) as revenue')
            ->groupBy('status')
            ->get()
            ->toArray();
    }
}
```

## The Edge Case: Event Sourcing
**Rule:** Do NOT implement Event Sourcing (storing every state change as a ledger of events). It adds massive complexity. CQRS does *not* require Event Sourcing. Stick to the "Lite" version: just use different classes/functions for reading vs. writing.
```
***

### 4. `SKILL.md` (The Dispatcher)
Drop this directly into the root of `skills/pragmatic-architecture/`. This acts as the gatekeeper. 

***
```markdown
---
name: pragmatic-architecture
description: >
  The master architectural gatekeeper. Enforces Vertical Slices, Hexagonal boundaries, and CQRS Lite. Use whenever structuring a new feature, planning a refactor, or deciding where code belongs. Triggers on "new feature", "architecture", "refactor", "how should I structure", or "where do I put this". MUST use this skill before writing feature code.
---

# Pragmatic Architecture Guide

You are an expert software architect. Before you write a single line of framework-specific code, you must enforce these high-level structural invariants. 

If you build monolithic horizontal layers or tightly couple external infrastructure to the core logic, the system will fail.

## Architectural Directives (Mandatory Reading)

Before scaffolding any feature, identify the architectural requirement and strictly adhere to its corresponding module:

1. **Feature Structuring & Folder Layout:** → READ `references/vertical-slice.md`
   *(Bans global `Controllers/` and `Services/` folders. Mandates grouping all related files into a single feature folder).*

2. **External API & Third-Party Integrations:** → READ `references/hexagonal-boundaries.md`
   *(Bans direct HTTP calls inside business logic. Mandates defining Interfaces/Ports in the core and pushing third-party SDKs into Adapters).*

3. **Complex Dashboards & Data Pipelines:** → READ `references/cqrs-lite.md`
   *(Bans using ORMs for heavy analytical reads. Enforces strict separation between Read queries and Write commands).*

## The 3 Golden Rules of Execution

1. **No Dogma:** Do not over-engineer simple CRUD. If an operation is just taking a name and saving it to a database, don't build a 5-layer Hexagonal abstraction. Use the framework's native tools. Save the heavy architecture for external boundaries (Payments, CRMs) and complex features.
2. **Copying is Better Than the Wrong Abstraction:** Do not extract "shared" logic into a global helper folder until at least three separate features require it. 
3. **No Anemic Data:** Do not pass generic associative arrays between architectural layers. Data must be typed using DTOs, Zod schemas, or native language structs at the boundary.

**Acknowledge and apply these structures before querying the framework-specific skills (`modern-laravel`, `modern-nextjs`, `nextjs-core`, etc.).**
```
