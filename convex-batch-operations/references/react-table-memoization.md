# React Table Memoization: The Reference Trap

## The Problem

React's `useMemo` isn't just for performance—it's for **reference stability**. When you map a Convex query result directly into a component prop, you create a new array reference on every render. Pure components like TanStack Table use shallow equality checks to determine if data changed. A new reference means "data changed," which destroys:

- Pagination state (page index resets to 0)
- Row selection state (selected rows clear)
- Sorting state (resets to default)
- Filter state (clears)
- Expanded rows (collapse)

## The Rule

**All transformed Convex queries MUST be wrapped in `useMemo` before passing to strict-equality components.**

### The Wrong Way (Reference Trap)

```tsx
// ❌ DON'T: New array every render, table state destroyed
function DocumentTable() {
  const documents = useQuery(api.documents.list);

  return (
    <DataTable
      data={documents?.map(d => ({ ...d, formattedDate: format(d.date) }))} // 🔥 Trap!
      columns={columns}
    />
  );
}
```

### The Right Way (Stable Reference)

```tsx
// ✅ DO: Stable reference preserves table state
function DocumentTable() {
  const documents = useQuery(api.documents.list);

  const data = useMemo(() => {
    if (!documents) return [];
    return documents.map(d => ({
      ...d,
      formattedDate: format(d.date),
    }));
  }, [documents]); // Only recompute when query result changes

  return (
    <DataTable
      data={data} // Stable reference
      columns={columns}
    />
  );
}
```

## TanStack Table Specifics

TanStack Table is the primary victim of this pattern because it's commonly used with Convex. The pattern applies equally to:

- **AG Grid** (`rowData` prop)
- **React Table** (any version)
- **Material-Table**
- **Custom pure data grids** using `React.memo` or `PureComponent`

### Complete Example: Bulk Delete with Stable Table

```tsx
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";

function BulkDeleteTable() {
  const documents = useQuery(api.documents.list);
  const deleteMany = useMutation(api.batch.deleteMany);

  const [rowSelection, setRowSelection] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ CRITICAL: useMemo prevents table state loss on every render
  const data = useMemo(() => documents ?? [], [documents]);

  // ✅ CRITICAL: Stable columns reference too
  const columns = useMemo(
    () => [
      { accessorKey: "title", header: "Title" },
      { accessorKey: "createdAt", header: "Created" },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  });

  const selectedIds = Object.keys(rowSelection);

  async function handleDelete() {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} documents?`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await deleteMany({ ids: selectedIds });
      // ✅ Only clear selection after confirmed success
      setRowSelection({});
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={selectedIds.length === 0 || isProcessing}
      >
        {isProcessing
          ? "Deleting..."
          : `Delete Selected (${selectedIds.length})`}
      </button>

      <table>
        {/* table rendering */}
      </table>
    </div>
  );
}
```

## The Edge Case: When NOT to Memoize

**Don't `useMemo` when:**

- **The consuming component doesn't care about reference equality**: Regular components re-render anyway; memo is overhead
- **The data is passed to a form library** like React Hook Form that manages its own state
- **You're intentionally forcing re-renders** (e.g., refresh button)

**Don't forget dependencies:**

```tsx
// ❌ Missing dependency: won't update when filters change
const filteredData = useMemo(
  () => data.filter(d => d.status === filter),
  [data] // Missing filter!
);

// ✅ Correct: Include all dependencies
const filteredData = useMemo(
  () => data.filter(d => d.status === filter),
  [data, filter]
);
```

## Quick Checklist

Before passing data to any table component:

- [ ] Is the data wrapped in `useMemo`?
- [ ] Does the `useMemo` dependency array include all variables used in transformation?
- [ ] Are columns also memoized (if defined inline)?
- [ ] Is the query result itself in the dependency array?
- [ ] Does pagination stay on the same page when unrelated state changes?
- [ ] Does selection persist after other UI interactions?
