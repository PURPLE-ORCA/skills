# i18n Architecture: The Re-Render Problem

## The Core Problem

React components only re-render when:

1. Their state changes (`useState`, `useReducer`)
2. Their props change
3. Their context value changes (`useContext`)

A translation function `t('key')` is just a function call. Calling it with the same key after a locale change returns different text, but **React doesn't know to call it again** because nothing in the component tree has changed.

## Three Approaches (and Why They Fail or Succeed)

### Approach 1: Isolated `useState` (BROKEN)

```tsx
// ❌ Each component has its own locale state
export function useI18n() {
  const [locale, setLocaleState] = useState(getCurrentLocale);
  const t = useCallback((key) => i18n.t(key), [locale]);
  return {
    t,
    locale,
    setLocale: (l) => {
      setI18nLocale(l);
      setLocaleState(l);
    },
  };
}
```

**Why it fails:** Component A calls `setLocale('fr')`. Component A re-renders (its own state changed). Components B, C, D do NOT re-render — they have their own independent `useState`. The locale is shared via the i18n singleton, but no re-render triggers.

### Approach 2: React Context (WORKS but fragile)

```tsx
// ✅ Context shares state across components
const I18nContext = createContext(null);
export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(getCurrentLocale);
  const value = useMemo(() => ({ locale, setLocale: (l) => { ... } }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
```

**Why it can break:**

- Requires wrapping the app with `<I18nProvider>`
- If nested incorrectly (inside another provider that swallows renders), context propagation fails
- The `t` function must be recreated when locale changes (or it reads stale locale)
- Additional `useMemo`/`useCallback` complexity

### Approach 3: Event Emitter (RELIABLE)

```tsx
// ✅ Each hook subscribes to a module-level event emitter
const listeners = new Set<Listener>();

export function useI18n() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    t: (key, opts) => i18n.t(key, opts), // reads live singleton
    locale: getCurrentLocale(),
    setLocale: (l) => {
      setI18nLocale(l);
      listeners.forEach((fn) => fn());
    },
  };
}
```

**Why it works:**

- No provider needed — hooks subscribe directly
- `forceUpdate` triggers a re-render in every subscribing component
- `i18n.t()` reads the live singleton at call time — always correct
- `getCurrentLocale()` returns the current value on each render
- Simple, predictable, no context tree issues

## Data Flow

```
User taps language picker
       │
       ▼
setLocale('fr')          ── useI18n hook
       │
       ▼
setI18nLocale('fr')      ── sets i18n.locale = 'fr'
       │
       ▼
notifyListeners()        ── calls forceUpdate(n+1) on all subscribers
       │
       ▼
React batch re-render    ── all useI18n() consumers re-render
       │
       ▼
t('settings.title')      ── calls i18n.t('settings.title')
       │                        ── reads i18n.locale === 'fr'
       │                        ── returns "Paramètres"
       ▼
UI updates               ── new text rendered
```

## Import Decision Tree

```
Is this a React component?
├── YES → import { useI18n } from '@/hooks/useI18n'
│         const { t } = useI18n();
│
└── NO → Is it called during render or a handler?
    ├── YES (hook, utility function, constant getter)
    │   → import { t } from '@/locales'
    │     // t() reads live i18n.locale at call time
    │
    └── NO (module-scope code, Zod schemas)
        → import { t } from '@/locales'
          // ⚠️ Frozen at import time — known tradeoff
```

## Why Static `t()` Works in Hooks but Not Components

```tsx
// Hook — called during render, reads current locale
function useBookingNavigation() {
  const { toast } = useToast();
  const handleSuccess = () => {
    toast.show({ label: t('common.success') }); // reads live locale ✅
  };
}

// Component — renders once, text never updates
function MyComponent() {
  return <Text>{t('common.welcome')}</Text>; // no re-render trigger ❌
}
```

The hook's `toast.show()` is called in response to user action (button press), which triggers a render. The component's JSX is rendered once and never re-evaluated unless something in the component changes.
