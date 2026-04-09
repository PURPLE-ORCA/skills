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