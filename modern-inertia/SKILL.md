---
name: modern-inertia
description: 
  Modern Inertia.js (v3.x) best practices, migration patterns, and React 19 integration. Use when writing, reviewing, or refactoring Laravel + React code using Inertia v3. Triggers on "inertia v3", "inertia migration", "useHttp", "optimistic updates", "remove axios", "vite inertia plugin", "instant visits", "layout props", or handling forms in modern Inertia.
---

# Modern Inertia (v3.x) Complete Guide

This skill covers Inertia v3 (Beta) and its integration with React 19. Every section follows: **what it is** → **DO this** → **DON'T do that** → **migration path**.

## Critical DO / DON'T Quick Reference

| DO (Modern Inertia v3) | DON'T (Legacy v2/Anti-pattern) | Why |
|---|---|---|
| Use the `@inertiajs/vite` plugin for setup | Manually configure `resolve` and SSR entry points | The plugin auto-resolves `./Pages` and wires up SSR silently |
| Use `useHttp()` for standalone API calls | Reach for `axios` or `fetch` for background data | `useHttp` gives reactive state (progress, errors) without router visits |
| Chain `.optimistic()` on forms or router visits | Build manual `useState` rollbacks with try/catch | v3 has native optimistic UI with automatic rollback on server/validation errors |
| Use `preserveErrors: true` on partial reloads | Manually stash errors in local state | Prevents wiping out existing form validation when refreshing a component |
| Use `preserveFragment: true` | Rely on custom JS to scroll to `#hashes` after redirect | v3 natively supports keeping URL hash fragments intact across redirects |
| Pass `layout` inside `createInertiaApp` | Manually wrap every single page in a `<Layout>` | v3 allows defining a global default layout at the app root |
| Use `router.cancelAll()` to abort | Use `router.cancel()` | `cancelAll` handles sync, async, and prefetch requests |

## Core Architecture & UX Changes

### 1. Zero-Config SSR via Vite
You no longer need a separate `ssr.tsx` file, nor do you need to manually resolve page components in your entry point. SSR works out of the box during `bun run dev`.

```tsx
// In vite.config.js: plugins: [laravel(...), react(), inertia()]
// In app.tsx:
import { createInertiaApp } from '@inertiajs/react';

createInertiaApp({
  // Optional: Set a default layout for all pages here
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
}); 
```

### 2. Standalone HTTP Requests (`useHttp`)
For requests that shouldn't trigger a page visit (e.g., live search). It provides the exact same developer experience as `useForm`, but returns data instead of a router visit.

```tsx
import { useHttp } from '@inertiajs/react';

const http = useHttp({ query: '' });

const search = () => {
  http.get('/api/search').then(results => console.log(results));
  // http.processing and http.errors are automatically available
};
```

### 3. Instant Visits
To make navigation feel instantaneous, Inertia v3 can immediately render the destination page component using shared/cached props before the server even responds.

```tsx
// Use the 'instant' prop on Links to skip the loading state
import { Link } from '@inertiajs/react';

<Link href="/dashboard" instant>Dashboard</Link>
```

### 4. Native Optimistic Updates
Applying UI changes instantly before the server responds, with guaranteed rollback if the request fails (validation error, network drop, etc.).

```tsx
import { useForm } from '@inertiajs/react';

const form = useForm({ name: '' });

const addTodo = () => {
  form
    .optimistic((props) => ({
      // Receive current page props, return updated props
      todos: [...props.todos, { id: Date.now(), name: form.name }]
    }))
    .post('/todos');
};
```

### 5. Layout Props
Stop using React Context to pass state up from a Page to a Layout (like changing the `<title>` or a sidebar toggle). Use the Layout Props API to define defaults in your layout and override them in your pages.

```tsx
// In your Layout:
import { useLayoutProps } from '@inertiajs/react';

const { title } = useLayoutProps({ title: 'Default App Name' });

// In your Page:
import { setLayoutProps } from '@inertiajs/react';

setLayoutProps({ title: 'User Dashboard' });
```

## Anti-Patterns to Fix Immediately

### 1. The "Ghost of Axios"
If you upgrade to v3 and leave `axios`, `lodash-es`, or `qs` in your `package.json`, you are defeating the performance gains. Use the built-in XHR client. 

### 2. Overlapping React 19 and Inertia State
**Rule of Thumb:** If the action changes the URL or relies on Laravel's session-based validation errors, use Inertia's `useForm` and `.optimistic()`. If it's a completely isolated client-side transition without routing, React 19's `useActionState` and `useOptimistic` apply. Don't mix them on the same form.

### 3. Ugly Default Laravel Error Pages
Don't let your Inertia app drop back to a standard Laravel Blade error page on a 500 error. Use v3's `Inertia::handleExceptionsUsing()` in your Laravel exception handler so 404s and 500s are rendered as proper Inertia React components with your shared layout data.

## Execution Checklist for Upgrading
1. Run `bun uninstall axios qs lodash-es`.
2. Update `@inertiajs/react` and `inertiajs/inertia-laravel` to `^3.0`.
3. Install `@inertiajs/vite@^3.0` and add it to `vite.config.js`.
4. Delete your `ssr.tsx` file and stop your `inertia:start-ssr` local process.
5. Republish config: `php artisan vendor:publish --provider="Inertia\ServiceProvider" --force`
6. Clear views: `php artisan view:clear`
