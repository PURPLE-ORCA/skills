# Convex Backend Auth Helpers

Stop writing `const userId = await auth.getUserId(ctx); if (!userId) throw new Error(...)` in every single file. Use `convex-helpers/server/customFunctions` to build reusable, trusted wrappers.

When using these wrappers, the `handler` only executes if the `input` validation passes. The `user` is automatically injected into the `ctx`.

## 1. The Standard Authenticated User (`userMutation`)

Use this for operations that simply require *any* logged-in user.

```typescript
// convex/lib/userMutation.ts
import { customMutation } from "convex-helpers/server/customFunctions";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";

export const userMutation = customMutation(mutation, {
  args: {},
  input: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("401: Unauthenticated");

    const user = await ctx.db.get("users", userId);
    if (!user) throw new Error("404: User not found");

    // Injects `user` into the ctx for the handler
    return { ctx: { user }, args };
  },
});

// USAGE:
export const addNote = userMutation({
  args: { body: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("notes", { body: args.body, authorId: ctx.user._id });
  },
});
```

## 2. Role-Based Access Control / Team Scopes (`teamMutation`)

Use this when a user must belong to a specific team OR have a specific role within that team to perform an action.

```typescript
// convex/lib/teamMutation.ts
import { customMutation } from "convex-helpers/server/customFunctions";
import { v } from "convex/values";
import { userMutation } from "./userMutation"; // Build on top of the base user wrapper

const ROLE_ORDER = ["anonymous", "user", "admin"];

function hasRequiredRole(actual: string, required: string) {
  return ROLE_ORDER.indexOf(actual) >= ROLE_ORDER.indexOf(required);
}

export const teamMutation = customMutation(userMutation, {
  args: { teamId: v.id("teams") },
  // Notice we can accept `opts` to parameterize the wrapper
  input: async (ctx, args, opts: { role: "user" | "admin" }) => {
    const membership = await ctx.db
      .query("teamMembership")
      .withIndex("by_team_user", q => q.eq("teamId", args.teamId).eq("userId", ctx.user._id))
      .unique();

    if (!membership || membership.status !== "active") {
      throw new Error("403: Not an active team member");
    }

    if (!hasRequiredRole(membership.role, opts.role)) {
      throw new Error(`403: Insufficient permissions. Required: ${opts.role}`);
    }

    // Injects teamId as a trusted variable
    return { ctx: { teamId: args.teamId }, args: {} };
  },
});

// USAGE (Admin Only Endpoint):
export const suspendUser = teamMutation({
  role: "admin", // Parametrized auth!
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    // The handler only runs if the user is an active admin of the team.
    // ctx.teamId and ctx.user are guaranteed to be valid here.
    // ... execution logic ...
  },
});
```

## 3. Bespoke Endpoint Authorization

If the logic doesn't fit neatly into a reusable role (e.g., "User must be the assigned judge for this specific assignment"), use the basic `userMutation` and write the bespoke check immediately at the top of the handler.

```typescript
export const reviewSubmission = userMutation({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get("assignments", args.assignmentId);
    
    // Bespoke Authorization Logic
    if (!assignment) throw new Error("404: Missing assignment");
    if (!assignment.judgeIds.includes(ctx.user._id)) {
      throw new Error("403: You are not an assigned judge for this assignment");
    }

    // ... execution logic ...
  },
});
```

## The Edge Case / Anti-Patterns

**When NOT to use wrappers:**
* **Public Endpoints:** Queries/mutations that do not require authentication should use the standard `query`/`mutation` from `_generated/server`. Do not wrap them.
* **Webhooks:** Use standard `httpAction` and verify HMAC signatures manually. Never wrap webhooks in `userMutation`.
* **Complex RLS:** Unless explicitly instructed by the Lead Developer, **DO NOT** implement Row-Level Security (RLS) wrappers. RLS obscures intent and makes debugging difficult.

**Authorization Failures:**
Always throw explicit HTTP-like error codes:
* `401: Unauthenticated` - No valid session/user
* `403: Forbidden` - Authenticated but lacks permission
* `404: Not Found` - Resource doesn't exist (or user shouldn't know it exists)

This provides consistent error handling for clients and makes debugging logs easier.
