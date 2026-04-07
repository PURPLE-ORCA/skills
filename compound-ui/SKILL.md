---
name: compound-ui
description: >
  Enforces strict React Compound Component architecture, dot-notation, and a hard 120-line file limit. Use when writing, reviewing, or refactoring UI components in React, Next.js, or React Native/Expo. Triggers on "build a component", "refactor UI", "create a card", "design system", or when generating UI elements. MUST use this skill to prevent monolithic god-components and boolean-prop hell.
---

# Strict Compound UI Architecture

This skill enforces a zero-tolerance policy for bloated "God Components." The era of passing 20 boolean props to configure a single component is over. We build UI using Compound Components (Dot Notation), we keep our files under 120 lines, and we do not wrap base components unnecessarily.

## The Three Ironclad Rules

1. **The 120-Line Death Limit:** No component file may exceed 120 lines. If a component requires more than 120 lines, its internal logic or sub-components MUST be extracted into separate files or custom hooks.
2. **No Boolean Prop Hell:** Never use props like `showTitle={true}`, `hasFooter`, or `isDark`. Let the consumer compose the UI explicitly by passing children.
3. **No Base Component Overrides:** Do not create a custom `<Text>` or `<Box>` component just to add a single margin prop. Use the underlying design system or styling solution directly.

## DO / DON'T Quick Reference

| DO (Strict Compound) | DON'T (The Monolith) | Why |
|---|---|---|
| `<Card><Card.Title>Hello</Card.Title></Card>` | `<Card title="Hello" showTitle={true} />` | Compound components scale. Monoliths become unmaintainable messes of if/else statements. |
| Use React Context for shared state | Pass `isOpen` down to 5 nested children via props | Context allows Compound children to talk to the parent without prop-drilling. |
| Split files at 120 lines | Write a 500-line `Dropdown.tsx` file | Enforces modularity and readability. |
| Add concise JSDoc comments | Leave complex Context providers undocumented | Developers need to know what a Compound wrapper actually provides to its children. |

---

## Pattern: The Compound Component (Dot Notation)

**What it is:** Instead of one massive component that controls everything via props, you create a Parent wrapper that holds state (usually via Context) and export Child components attached to it.

### 1. The Anti-Pattern (Kill this immediately)
```tsx
// ---- DON'T: The God Component ----
// It handles logic, structure, and variants all in one file.
export function Modal({ isOpen, onClose, title, description, showFooter, confirmText }) {
  return (
    <div className="overlay">
      <div className="modal">
        {title && <h2>{title}</h2>}
        {description && <p>{description}</p>}
        {/* ... 100 lines of spaghetti logic ... */}
        {showFooter && (
          <footer><button onClick={onClose}>{confirmText}</button></footer>
        )}
      </div>
    </div>
  );
}
```

### 2. The Modern Standard (Compound + Context)
```tsx
// ---- DO: Strict Compound UI ----
import { createContext, useContext } from 'react';

// 1. Create the Context
const ModalContext = createContext<{ onClose: () => void } | null>(null);

function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) throw new Error('Modal components must be rendered within <Modal>');
  return context;
}

// 2. The Parent Wrapper (Provides state)
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <ModalContext.Provider value={{ onClose }}>
      <div className="overlay">
        <div className="modal">{children}</div>
      </div>
    </ModalContext.Provider>
  );
}

// 3. The Children (Consume state only if needed)
function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold">{children}</h2>;
}

function CloseButton() {
  const { onClose } = useModalContext(); // Implicit state access
  return <button onClick={onClose}>Close</button>;
}

// 4. Attach via Dot Notation
Modal.Title = Title;
Modal.CloseButton = CloseButton;

export { Modal };
```

### 3. Usage
The consumer now has absolute control over the layout without adding a single new prop to the API.

```tsx
<Modal onClose={() => setOpen(false)}>
  <Modal.Title>Delete Project?</Modal.Title>
  {/* The consumer can inject anything here. No need for a 'description' prop. */}
  <div className="my-custom-warning-box">You cannot undo this!</div>
  <Modal.CloseButton />
</Modal>
```

## Agent Execution Protocol

When instructed to build or refactor a UI component:
1. **Analyze:** Does this component rely on multiple boolean props to toggle UI elements? If yes, convert to Compound Components.
2. **Extract:** Does the file approach 120 lines? Extract Sub-components into their own files immediately. Do not ask for permission.
3. **Document:** Add a short JSDoc comment to the Parent component explaining the Context state it provides.
4. **Export:** Always attach sub-components to the parent using dot notation (`Parent.Child = Child`) before exporting.
```
***

This completely blocks the AI from trying to be "clever" with massive configuration objects. It forces a clean, declarative UI structure that fits your exact constraints. 

Push this one up. Do you want to hit the `maestro-yaml-architect` next so your testing pipeline stops failing, or do you want to tackle `modern-reanimated-3` for the Expo performance?