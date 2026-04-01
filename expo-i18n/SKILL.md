---
name: expo-i18n
description: >
  Complete i18n/localization setup for React Native Expo apps. Use this skill when setting up
  multi-language support (FR/EN/AR or any languages), adding translation files, creating
  translation hooks, fixing language switching issues, or converting hardcoded strings to
  translated keys. Triggers on: "i18n", "localization", "multi language", "translate",
  "french/english/arabic", "language switch", "language picker", "RTL", "expo-localization",
  "i18n-js". MUST use this skill for ANY i18n task — do not attempt i18n setup without it.
---

# Expo i18n Skill

Multi-language support for React Native Expo apps using `expo-localization` + `i18n-js`.

## Tech Stack

- **expo-localization**: Native locale detection from device settings
- **i18n-js**: Lightweight translation engine (~6KB, not react-i18next at 71KB)
- **TypeScript**: Type-safe translation keys
- **Event emitter pattern**: Cross-component re-renders on locale change (NOT Context, NOT isolated useState)

## Critical Architecture Decision

**The #1 pitfall that breaks language switching:** Using `import { t } from '@/locales'` in components.

```tsx
// ❌ BROKEN — no re-render on locale change
import { t } from '@/locales';
function MyScreen() {
  return <Text>{t('common.welcome')}</Text>;
}

// ✅ CORRECT — re-renders when locale changes
import { useI18n } from '@/hooks/useI18n';
function MyScreen() {
  const { t } = useI18n();
  return <Text>{t('common.welcome')}</Text>;
}
```

The static `t()` reads from the i18n singleton correctly, but without a React state change, components never re-render to call it again. See [references/architecture.md](references/architecture.md) for the full re-render mechanism.

## Implementation Workflow

### Step 1: Install Dependencies

```bash
npx expo install expo-localization i18n-js
```

### Step 2: Create Translation Files

```
src/locales/
├── index.ts                      # i18n singleton + exports
├── types.ts                      # TypeScript types for keys
├── translations/
│   ├── en.json                   # English
│   ├── fr.json                   # French
│   └── ar.json                   # Arabic (or any language)
└── utils/
    └── formatters.ts             # Intl-based date/number/currency
```

**Translation file structure** — nest by feature/screen:

```json
{
  "common": {
    "welcome": "Welcome",
    "loading": "Loading...",
    "error": "Error"
  },
  "settings": {
    "title": "Settings",
    "language": "Language"
  },
  "validation": {
    "required": "This field is required"
  }
}
```

### Step 3: Create i18n Singleton (`src/locales/index.ts`)

```typescript
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import en from './translations/en.json';
import fr from './translations/fr.json';
import ar from './translations/ar.json';
import type { Language } from '@/types/localization';

const SUPPORTED: Language[] = ['en', 'fr', 'ar'];

export const i18n = new I18n({ en, fr, ar });

const deviceLang = getLocales()[0]?.languageCode ?? 'en';
i18n.locale = SUPPORTED.includes(deviceLang as Language) ? deviceLang : 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

// Static t — for hooks, utilities, constants ONLY (not components)
export const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options);
export const getCurrentLocale = (): Language => i18n.locale as Language;
export const setLocale = (locale: Language) => {
  i18n.locale = locale;
};
```

### Step 4: Create TypeScript Types (`src/locales/types.ts`)

```typescript
import en from './translations/en.json';

export type TranslationKeys = typeof en;

export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

export type TranslationKey = NestedKeyOf<TranslationKeys>;
```

### Step 5: Create the Event Emitter Hook (`src/hooks/useI18n.tsx`)

**This is the most critical file.** It uses an event emitter pattern — NOT React Context, NOT isolated useState.

```tsx
import { useState, useCallback, useEffect } from 'react';
import { i18n, setLocale as setI18nLocale, getCurrentLocale } from '@/locales';
import type { Language } from '@/types/localization';

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((l) => l());
}

export function setLocaleAppWide(newLocale: Language) {
  setI18nLocale(newLocale);
  notifyListeners();
}

export function useI18n() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setLocale = useCallback((newLocale: Language) => {
    setLocaleAppWide(newLocale);
  }, []);

  const locale = getCurrentLocale();

  return {
    t: (key: string, options?: Record<string, unknown>) => i18n.t(key, options),
    locale,
    setLocale,
    isRTL: locale === 'ar',
  };
}
```

**Why event emitter over Context?**

- Context requires a `<Provider>` wrapper and can have issues with nested providers (HeroUINativeProvider, ConvexAuthProvider, etc.)
- Isolated `useState` in each `useI18n()` call doesn't share state
- Event emitter: each hook subscribes directly, `setLocale` notifies all, every component re-renders
Alright, let's patch this thing up so it's bulletproof. 

### Alternative: Using a Global State Manager (Zustand)

If your app already uses a global state manager like Zustand, Redux, or Jotai, you can rip out the custom `Set` event emitter entirely. There's no reason to maintain a secondary, bespoke reactivity cycle when your app already has one.

Instead, just store the locale in your global store. Update the `i18n` singleton first, then update the store to trigger the component re-renders.

**Zustand Implementation (`src/store/useLocaleStore.ts`):**

```tsx
import { create } from 'zustand';
import { i18n, setLocale as setI18nLocale, getCurrentLocale } from '@/locales';
import type { Language } from '@/types/localization';

interface LocaleState {
  locale: Language;
  isRTL: boolean;
  t: typeof i18n.t;
  setLocale: (newLocale: Language) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: getCurrentLocale(),
  isRTL: getCurrentLocale() === 'ar',
  t: (key, options) => i18n.t(key, options),
  
  setLocale: (newLocale) => {
    // 1. Update the static translation engine
    setI18nLocale(newLocale); 
    
    // 2. Trigger React re-renders across the app
    set({ 
      locale: newLocale,
      isRTL: newLocale === 'ar' 
    }); 
  },
}));
```

**Usage:**
Now, you just swap `useI18n()` for `useLocaleStore()` in your components. It does the exact same job, but relies on Zustand's highly optimized re-render engine instead of a custom hook.

```tsx
import { useLocaleStore } from '@/store/useLocaleStore';

export default function MyScreen() {
  const { t, setLocale } = useLocaleStore();
  return <Text>{t('common.welcome')}</Text>;
}
```

### Step 6: Use in Components

```tsx
import { useI18n } from '@/hooks/useI18n';

export default function MyScreen() {
  const { t, locale, setLocale, isRTL } = useI18n();

  return (
    <View>
      <Text>{t('common.welcome')}</Text>
      <Text>{t('home.greeting', { name: 'John' })}</Text>

      <Pressable onPress={() => setLocale('fr')}>
        <Text>Switch to French</Text>
      </Pressable>
    </View>
  );
}
```

### Step 7: Wire the Language Picker

```tsx
<RadioGroup value={locale} onValueChange={(v) => setLocale(v as Language)}>
  {languages.map((lang) => (
    <RadioGroup.Item key={lang.code} value={lang.code}>
      <Text>{lang.label}</Text>
    </RadioGroup.Item>
  ))}
</RadioGroup>
```

### Step 8: Configure `app.json`

```json
{
  "expo": {
    "plugins": ["expo-localization"],
    "ios": {
      "infoPlist": {
        "CFBundleAllowMixedLocalizations": true
      }
    },
    "locales": {
      "fr": "./locales/app-metadata/fr.json",
      "ar": "./locales/app-metadata/ar.json"
    }
  }
}
```

## Where to Use Static `t()` vs `useI18n()`

| Code Type                   | Import         | Why                                                 |
| --------------------------- | -------------- | --------------------------------------------------- |
| Screen components           | `useI18n()`    | Need re-renders on locale change                    |
| Sub-components              | `useI18n()`    | Same — must re-render                               |
| Custom hooks (toast alerts) | `import { t }` | Called at render/handler time, reads live singleton |
| Constants/functions         | `import { t }` | Called lazily during render                         |
| Zod schemas                 | `import { t}`  | Frozen at import time (known tradeoff)              |
| Navigation config           | `import { t }` | Functions called at render time                     |

## Anti-Patterns to Avoid

### 1. Frozen Default Props

```tsx
// ❌ BROKEN — t() runs once at module load, frozen forever
export function PackTitle({ title = t('packs.details') }: Props) {
  return <Title>{title}</Title>;
}

// ✅ CORRECT — t() runs at render time
export function PackTitle({ title }: Props) {
  const { t } = useI18n();
  return <Title>{title ?? t('packs.details')}</Title>;
}
```

### 2. Zod Schemas at Module Scope

```tsx
// ⚠️ ACCEPTABLE TRADEOFF — messages freeze at import time
// Validation errors will be in the device's initial locale
export const phoneSchema = z.string().min(8, t('validation.phoneMin'));

// FIX (if needed): factory functions
export const getPhoneSchema = () => z.string().min(8, t('validation.phoneMin'));
```

### 3. Using `useTranslation()` from react-i18next

Don't use react-i18next — it's 71KB vs i18n-js at 6KB. This skill uses i18n-js.

### 4. AsyncStorage for Language Preference

If persisting language preference, use `expo-secure-store` (Expo native) or `AsyncStorage`. Don't use both — pick one per project conventions.

### 5. Module-Level `t()` in Components

```tsx
// ❌ BROKEN — evaluated once
const LABEL = t('common.save');

// ✅ CORRECT — evaluated on each render
function MyComponent() {
  const { t } = useI18n();
  const label = t('common.save');
}
```

## RTL Support (Arabic)

The hook exports `isRTL`. To enable full RTL layout:

```tsx
import { I18nManager } from 'react-native';

// Only call this when locale changes to/from Arabic
// WARNING: Requires app restart for full effect
I18nManager.allowRTL(isRTL);
I18nManager.forceRTL(isRTL);
```

RTL flipping requires a full app restart on React Native. Consider showing a "Restart required" toast when switching to/from Arabic.

## Formatter Utilities (`src/locales/utils/formatters.ts`)

```typescript
import { getCurrentLocale } from '../index';

export function formatDate(date: Date, style: 'short' | 'long' = 'short'): string {
  const locale = getCurrentLocale();
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: style === 'long' ? 'long' : '2-digit',
    day: 'numeric',
  }).format(date);
}

export function formatCurrency(amount: number, currency = 'MAD'): string {
  return new Intl.NumberFormat(getCurrentLocale(), {
    style: 'currency',
    currency,
  }).format(amount);
}
```

Uses native `Intl` API (built into Hermes) — zero bundle size, no extra libraries.

## Adding a New Language

1. Create `src/locales/translations/{code}.json` with all keys matching `en.json`
2. Add to `i18n` constructor: `new I18n({ en, fr, ar, {code} })`
3. Add to `SUPPORTED` array in `src/locales/index.ts`
4. Add to language picker array in settings screen
5. (Optional) Create `locales/app-metadata/{code}.json` for app name

## Verification

After setup:

1. Switch language in settings → settings screen text changes immediately
2. Navigate away and back → all screens show new language
3. Reload app → persists to device locale (unless user preference is saved)
4. `bun run typecheck` passes
5. `bun run lint` has no new errors

## Troubleshooting

| Problem                               | Cause                         | Fix                                      |
| ------------------------------------- | ----------------------------- | ---------------------------------------- |
| Language switch does nothing          | Component uses static `t()`   | Switch to `useI18n()`                    |
| Settings screen doesn't update        | Missing `forceUpdate` trigger | Verify event emitter hook                |
| Some text stays old language          | Frozen default props          | Remove `t()` from default params         |
| Validation errors always English      | Zod schemas at module scope   | Accept tradeoff or use factory functions |
| Metro can't resolve `i18n-js`         | Package not installed         | `npx expo install i18n-js`               |
| TypeScript errors on translation keys | Types not generated           | Regenerate from `en.json`                |
