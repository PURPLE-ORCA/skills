---
name: convex-batch-operations
description: Convex batch mutation patterns for mass updates and deletes. Triggers on "batch delete", "bulk update", "mass edit", "delete all selected", "update multiple", Promise.all with mutations, "many mutations", "concurrent connections limit", "16 connection limit", "table pagination reset", "TanStack table selection lost", "row selection clears". You must use this skill whenever implementing multi-select operations, bulk actions, or handling data tables with Convex backend.
---

# Convex Batch Operations

## The Hook

Developers building mass-update or mass-delete features hit two catastrophic failures: **The Data Failure**—firing hundreds of individual Convex mutations via `Promise.all()`, violating the 16-concurrent-connection limit and self-DDoSing the browser; and **The UI Failure**—passing un-memoized mapped data into pure table components like TanStack Table, causing pagination and selection state to reset on every reactive query update. This skill enforces chunking, server-side batching, and reference-stable data pipelines.

## DO / DON'T

| Standard (DO) | Anti-Pattern (DON'T) | Why |
|---------------|----------------------|-----|
| Chunk client-side mutations in groups of 5-10 with delays | `Promise.all(array.map(id => delete(id)))` on unbounded arrays | Violates 16-connection limit, browser locks up, mutations fail |
| Offload bulk work to a server-side Convex action | Looping mutations from the client for >50 items | Actions have higher limits, better retry logic, no browser blocking |
| Use pessimistic UI with `isProcessing` state | Optimistic UI for destructive bulk operations | User must see confirmation and blocking state before data loss |
| Clear selection state only after confirmed success | Clearing selection immediately on click | If operation fails, selection is lost and user must re-select |
| Wrap mapped query data in `useMemo` before passing to data tables | `data={query.map(transform)}` directly to TanStack Table | New array reference every render destroys table state |

## Execution Protocol

1. **Analyze the operation size**
   - If <20 items: Client-side chunking is acceptable
   - If >20 items: Move logic to a Convex action with internal batching

2. **Ban raw Promise.all for unbounded arrays**
   - Any code suggesting `Promise.all(ids.map(...))` must be rejected
   - Replace with chunked sequential execution

3. **Implement client-side chunking** (only if staying client-side)
   ```ts
   // USE THIS PATTERN
   const BATCH_SIZE = 5;
   const DELAY_MS = 100;

   for (let i = 0; i < ids.length; i += BATCH_SIZE) {
     const chunk = ids.slice(i, i + BATCH_SIZE);
     await Promise.all(chunk.map(id => deleteMutation({ id })));
     if (i + BATCH_SIZE < ids.length) {
       await new Promise(r => setTimeout(r, DELAY_MS));
     }
   }
   ```

4. **Implement server-side batching** (preferred for >20 items)
   ```ts
   // convex/batch.ts
   export const deleteMany = action({
     args: { ids: v.array(v.id("documents")) },
     handler: async (ctx, { ids }) => {
       const BATCH_SIZE = 10;
       for (let i = 0; i < ids.length; i += BATCH_SIZE) {
         const chunk = ids.slice(i, i + BATCH_SIZE);
         await Promise.all(
           chunk.map(id =>
             ctx.runMutation(internal.documents.delete, { id })
           )
         );
       }
       return { deleted: ids.length };
     },
   });
   ```

5. **Enforce the UX pipeline**
   - **Confirmation Dialog**: Must show count of affected items
   - **Pessimistic UI Block**: Set `isProcessing` true, disable buttons
   - **Execute**: Call the batch mutation/action
   - **Clear on Success**: Only clear selection state after confirmed success
   - **Error Handling**: Keep selection intact on failure so user can retry

6. **Check for data table usage**
   - If the UI uses TanStack Table, AG Grid, or any pure data grid:
   - **YOU MUST READ** `references/react-table-memoization.md`

## The Edge Case / Anti-Patterns

**When NOT to apply these rules:**

- **Single mutations**: Individual create/update/delete operations don't need chunking
- **Real-time collaborative edits**: If multiple users edit simultaneously, server-side actions may cause race conditions; prefer client-side with optimistic UI
- **Ordered dependencies**: If items must be deleted in a specific order (parent → child), sequential loops are required regardless of chunking
- **Very large batches (>1000 items)**: Consider a background job with `ctx.scheduler` instead of blocking the UI

**Common Traps:**

- **The "just use Promise.all" trap**: "It's only 20 items" becomes 200 items in production with real data. Always enforce limits.
- **The "it works locally" trap**: Local Convex has no connection limit. Production will fail.
- **The "I'll memoize later" trap**: Table state loss is immediate. `useMemo` is required at implementation time, not a future optimization.
