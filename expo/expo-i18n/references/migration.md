# Migration Guide: From Hardcoded Strings to i18n

## Step-by-Step Conversion Process

### Phase 1: Foundation (do once)

1. Install: `npx expo install expo-localization i18n-js`
2. Create `src/locales/` directory with translation files
3. Create `src/hooks/useI18n.tsx` (event emitter hook)
4. No provider needed — skip wrapping `_layout.tsx`

### Phase 2: Convert Screen Components

For each screen component that has hardcoded UI strings:

```tsx
// BEFORE
import { Text } from 'react-native';
export default function MyScreen() {
  return <Text>Settings</Text>;
}

// AFTER
import { useI18n } from '@/hooks/useI18n';
export default function MyScreen() {
  const { t } = useI18n();
  return <Text>{t('settings.title')}</Text>;
}
```

**Pattern:**

1. Add `import { useI18n } from '@/hooks/useI18n';`
2. Add `const { t } = useI18n();` as the first line inside the component function
3. Replace each hardcoded string with `t('namespace.key')`
4. Add corresponding keys to ALL translation files (en.json, fr.json, ar.json)

### Phase 3: Convert Constants and Utilities

For constants that are called from components (e.g., label getters):

```tsx
// BEFORE
export const BOOKING_LABELS = {
  ADULTS: 'Adults',
  CHILDREN: 'Children',
};

// AFTER — function that calls t() lazily
import { t } from '@/locales';
export const getBookingLabels = () => ({
  ADULTS: t('booking.adults'),
  CHILDREN: t('booking.children'),
});

// Consumer component
const labels = getBookingLabels(); // called during render
```

### Phase 4: Fix Frozen Default Props

```tsx
// BEFORE — frozen at module load
export function Comp({ title = t('packs.details') }: Props) {
  return <Title>{title}</Title>;
}

// AFTER — reactive
export function Comp({ title }: Props) {
  const { t } = useI18n();
  return <Title>{title ?? t('packs.details')}</Title>;
}
```

**Search pattern:** grep for `= t('` in function parameter lists.

### Phase 5: Handle Zod Validation (Tradeoff)

```tsx
// Zod schemas at module scope — messages freeze at import time
export const phoneSchema = z.string().min(8, t('validation.phoneMin'));

// If you need dynamic messages, use factory functions:
export const getPhoneSchema = () => z.string().min(8, t('validation.phoneMin'));
```

Accept the tradeoff: validation errors show in the device's initial locale. This is usually fine — users rarely switch language mid-form.

## Conversion Checklist

For each file:

- [ ] Is it a React component? → Use `useI18n()`
- [ ] Is it a hook/utility called during render? → Use `import { t }`
- [ ] Does it have frozen default props with `t()`? → Fix to `title ?? t(...)`
- [ ] Are all translation keys added to en.json, fr.json, ar.json?
- [ ] Does `bun run typecheck` pass after conversion?

## Adding Translation Keys

1. Add to `en.json` first (source of truth)
2. Translate to `fr.json` and `ar.json`
3. Use dot-notation for nested access: `t('booking.roomTypes.single')`
4. Use `{{variable}}` for interpolation: `t('home.greeting', { name: 'John' })`

## Common String Categories

| Category        | Namespace      | Example Keys                          |
| --------------- | -------------- | ------------------------------------- |
| Shared labels   | `common.*`     | welcome, loading, error, save, cancel |
| Navigation      | `navigation.*` | home, explore, wishlist, profile      |
| Screen-specific | `{screen}.*`   | settings.title, booking.adults        |
| Form validation | `validation.*` | required, emailInvalid, phoneMin      |
| Error messages  | `auth.*`       | invalidEmail, tooManyRequests         |
| Empty states    | `explore.*`    | noResults, noRecentSearches           |

## Debugging Translation Issues

```tsx
// Check what i18n knows about
console.log(i18n.locale); // current locale
console.log(i18n.translations); // all loaded translations
console.log(i18n.t('settings.title')); // direct test

// Check if hook is subscribing
const { locale, t } = useI18n();
console.log('Hook locale:', locale);
console.log('Test translation:', t('settings.title'));
```
