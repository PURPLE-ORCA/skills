# Component Architecture: The Leaf Node Pattern

Next.js App Router uses Server Components by default. This is a feature, not an obstacle. If you use `"use client"` incorrectly, you will ship massive JavaScript bundles to the browser, destroy your SEO, and defeat the entire purpose of the framework.

## 1. Server by Default
**RULE: Do not use `"use client"` unless explicitly necessary.**

A component only earns the right to be a Client Component if it requires:
* Interactivity (e.g., `onClick`, `onChange`).
* State and Lifecycle Hooks (`useState`, `useEffect`, `useReducer`).
* Browser APIs (e.g., `window`, `localStorage`, `navigator`).

## 2. The Leaf Node Pattern
**RULE: Push `"use client"` as far down the component tree as physically possible.**

Never turn a large layout, page, or complex wrapper into a Client Component just because one button inside it needs state. Extract the interactive piece into its own tiny component (the "leaf") and import that leaf into your Server Component.

### Bad Pattern (Server Poisoning):
```tsx
// ❌ BAD: The entire Sidebar is now shipped to the client just for one toggle.
"use client";

import { useState } from "react";
import { NavigationLinks } from "./NavigationLinks"; // Infected (Client)
import { UserProfile } from "./UserProfile"; // Infected (Client)

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && (
        <>
          <NavigationLinks />
          <UserProfile />
        </>
      )}
    </aside>
  );
}
```

### Good Pattern (Leaf Node):
```tsx
// ✅ GOOD: Sidebar remains a Server Component. 
// Only the Toggle button goes to the client.
import { NavigationLinks } from "./NavigationLinks"; // Remains Server Component
import { UserProfile } from "./UserProfile"; // Remains Server Component
import { SidebarToggle } from "./SidebarToggle"; // The ONLY Client Component

export function Sidebar() {
  return (
    <aside>
      <SidebarToggle>
        <NavigationLinks />
        <UserProfile />
      </SidebarToggle>
    </aside>
  );
}
```

## 3. The Composition Pattern (Passing Server to Client)
**RULE: Never import a Server Component directly into a Client Component.**

If you import a Server Component into a file marked with `"use client"`, it automatically becomes a Client Component. 

If a Client Component needs to wrap Server Components (e.g., a layout wrapper, a modal, or an accordion), you must pass the Server Components as `children` or props from a parent Server Component.

```tsx
// ClientWrapper.tsx
"use client";
import { useState } from "react";

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Open</button>
      {isOpen && children}
    </div>
  );
}

// page.tsx (Server Component)
import { ClientWrapper } from "./ClientWrapper";
import { HeavyServerComponent } from "./HeavyServerComponent";

export default function Page() {
  return (
    <ClientWrapper>
      {/* HeavyServerComponent executes on the server and is passed as a slot */}
      <HeavyServerComponent />
    </ClientWrapper>
  );
}
```
