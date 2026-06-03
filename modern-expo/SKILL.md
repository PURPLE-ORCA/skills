---
name: modern-expo
description: >
  Modern Expo SDK 56 / React Native 0.85 / React 19.2 best practices, Expo Router v56 architecture,
  Expo UI stable primitives, and inline native modules. Use when writing, reviewing, refactoring,
  or migrating Expo React Native code. Triggers on "expo sdk 56", "expo ui", "expo router v56",
  "inline modules", "hermes v1", "react native 0.85", "expo upgrade", "precompiled modules",
  "expo-typescript generation", "react-navigation fork", "native tabs", "expo-file-system",
  "expo-notifications", "expo-camera", or "expo build speed". MUST use this skill to prevent
  legacy Expo SDK 54/55 anti-patterns, community library bloat, and outdated React Native boilerplate.
---

# Modern Expo (SDK 56 / React Native 0.85) Complete Guide

This skill enforces strict Expo SDK 56 architecture. The ecosystem has fundamentally changed: Expo UI is now stable with real SwiftUI/Jetpack Compose primitives, Expo Router has forked React Navigation, Hermes V1 is the default engine, and inline native modules eliminate the old create-module-package ceremony. If your code still imports from `@react-navigation/*`, uses community pickers/datetimepickers, or skips `AGENTS.md`, it is legacy.

Every section follows: **what it is** → **DO this** → **DON'T do that** → **migration path**.

## Critical DO / DON'T Quick Reference

| DO (Modern Expo SDK 56) | DON'T (Legacy/Anti-pattern) | Why |
|---|---|---|
| Import from `expo-router/react-navigation` | Import from `@react-navigation/*` | Expo Router v56 forked React Navigation. Direct `@react-navigation/*` imports are dead. |
| Use `@expo/ui` universal components | Import `@react-native-community/datetimepicker`, `@gorhom/bottom-sheet`, `@react-native-picker/picker` | Expo UI stable provides native drop-in replacements. Fewer deps, fewer native conflicts, easier future upgrades (via @Baconbrix). |
| Use inline modules (`expo-modules` in `app.json`) | Create a full Expo Module package for simple native code | Inline modules let you write Swift/Kotlin next to your JS files. No more standalone package ceremony. |
| Run `expo-type-information` for TS interfaces | Manually write TypeScript interfaces for native modules | Auto-generated types match your Swift declarations. Manual interfaces drift. |
| Use `npx expo run:ios` / `npx expo run:android` (dev builds) | Rely on Expo Go for development | Expo Go for SDK 56 is NOT on the App Store. Dev builds replicate production. |
| Use precompiled XCFrameworks (default) | Set `EXPO_USE_PRECOMPILED_MODULES=0` without reason | Precompiled modules cut iOS clean builds by ~1 minute (~16%). |
| Use `globalThis.fetch` | Import `expo/fetch` | `expo/fetch` is removed in SDK 56. Use platform fetch directly. |
| Use `useNativeState` for UI-thread state | Round-trip through JS for SwiftUI/Compose state | Worklet-driven native state eliminates JS bridge latency for flicker-free controls. |
| Add `AGENTS.md` + `CLAUDE.md` to new projects | Assume AI agents understand your project structure | SDK 56 ships AI-friendly scaffolding. Agent skills exist in `expo/skills`. |
| Use `createStaticLoader` / `createServerLoader` | Manually wire data loading for SSR | Type-safe data loaders for Expo Router's new streaming SSR. |
| Export `SuspenseFallback` from route files | Use default loading spinners | Expo Router v56 supports Suspense customization per-route. |
| Use Hermes bytecode diffing (default) | Ship full bundles on every OTA update | Binary patches are 58% smaller on average. Enabled by default. |
| Use `File.createUploadTask()` / `File.createDownloadTask()` | Run `FileSystem.uploadAsync()` without progress | Task-based APIs support progress callbacks and `AbortSignal`. |
| Use `<NavigationBar>` component | Manually configure Android nav bar via config plugins | Declarative component matches `<StatusBar>` API pattern. |

---

## 1. Expo Router v56: The React Navigation Fork

**What it is:** Expo Router no longer depends on `react-navigation`. It forks the internals it needs. The runtime API (`<Stack>`, `<Tabs>`, file-based routing) is unchanged, but every import path from `@react-navigation/*` must migrate.

### Import Migration Map

| Old Import | New Import |
|---|---|
| `@react-navigation/native` | `expo-router/react-navigation` |
| `@react-navigation/core` | `expo-router/react-navigation` |
| `@react-navigation/stack` | `expo-router/js-stack` |
| `@react-navigation/bottom-tabs` | `expo-router/js-tabs` |
| `@react-navigation/material-top-tabs` | `expo-router/js-top-tabs` |
| `@react-navigation/native-stack` | Use `<Stack>` from `expo-router` |
| `@react-navigation/drawer` | Use `<Drawer>` from `expo-router` |

```bash
# Automated codemod:
npx expo-codemod sdk-56-expo-router-react-navigation-replace src
```

```tsx
// ---- DON'T: Legacy Import ----
import { useNavigation } from '@react-navigation/core';

// ---- DO: Forked Import ----
import { useNavigation } from 'expo-router/react-navigation';
```

### Streaming SSR & Data Loaders

Expo Router v56 supports streaming SSR, API routes, middleware, and static rendering. Data loaders are type-safe.

```tsx
// ---- DO: Type-Safe Data Loaders ----
import { createServerLoader } from 'expo-router';

export const loader = createServerLoader(async ({ params }) => {
  const post = await db.posts.findUnique({ where: { id: params.id } });
  if (!post) throw new Response('Not Found', { status: 404 });
  return post;
});
```

### Suspense Customization

```tsx
// ---- DO: Per-Route Loading States ----
export function SuspenseFallback() {
  return <SkeletonLoader />;
}

export default function PostScreen() {
  // Uses the SuspenseFallback above during streaming
  const post = useLoaderData();
  return <PostView post={post} />;
}
```

---

## 2. Expo UI Stable (SwiftUI + Jetpack Compose)

**What it is:** `@expo/ui` now provides real native SwiftUI (iOS) and Jetpack Compose (Android) primitives from a single JavaScript import. No JavaScript reimplementation. Production-ready.

### Universal Components

```tsx
import { Host, Row, Column, ScrollView, Text, TextInput, Button, Switch, Slider, Checkbox, BottomSheet } from '@expo/ui';
```

Platform-specific packages remain for exclusive features:
```tsx
import { glassEffect } from '@expo/ui/swift-ui';      // iOS only
import { LazyColumn } from '@expo/ui/jetpack-compose'; // Android only
```

### Drop-in Replacements (Kill Community Deps)

| Community Package | Expo UI Replacement |
|---|---|
| `@react-native-community/datetimepicker` | `@expo/ui/community/datetime-picker` |
| `@react-native-community/slider` | `@expo/ui/community/slider` |
| `react-native-pager-view` | `@expo/ui/community/pager-view` |
| `@react-native-picker/picker` | `@expo/ui/community/picker` |
| `@react-native-segmented-control/segmented-control` | `@expo/ui/community/segmented-control` |
| `@react-native-masked-view/masked-view` | `@expo/ui/community/masked-view` |
| `@react-native-menu/menu` | `@expo/ui/community/menu` |
| `@gorhom/bottom-sheet` | `@expo/ui/community/bottom-sheet` |

```tsx
// ---- DON'T: Community Package ----
import DateTimePicker from '@react-native-community/datetimepicker';

// ---- DO: Expo UI Native Primitives ----
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
```

### Material 3 & Worklet-Driven State

```tsx
import { useMaterialColors } from '@expo/ui';
import { Icon } from '@expo/ui';
import { useNativeState } from '@expo/ui/swift-ui'; // or '@expo/ui/jetpack-compose'

// Dynamic Material 3 colors from system theme
const colors = useMaterialColors();

// Flicker-free native state (UI thread, no JS round-trip)
const [value, setValue] = useNativeState(observableObject, 'key');
```

### Custom Views & Modifiers

SDK 56 lets you extend Expo UI with your own SwiftUI/Compose views:

```tsx
// Define in Swift/Kotlin, use in JS
// The layout, prop, and event plumbing is handled by Expo UI
```

### Dependency Consolidation (via @Baconbrix)

Replacing 8 community packages with `@expo/ui` isn't just about native quality — it's about **upgrade friction**. Every community package is a potential breaking change on SDK upgrades. Consolidating to `@expo/ui` means one import to update, not eight separate migration guides.

```bash
# Audit what you can replace:
npm ls @react-native-community/datetimepicker @gorhom/bottom-sheet @react-native-picker/picker \
  @react-native-community/slider react-native-pager-view \
  @react-native-segmented-control/segmented-control @react-native-masked-view/masked-view \
  @react-native-menu/menu
```

---

## 3. Inline Modules & Type Generation

**What it is:** Write Swift/Kotlin modules directly in your project structure — no standalone Expo Module package needed. `expo-type-information` auto-generates matching TypeScript interfaces.

### Setup

```json
// app.json
{
  "expo": {
    "plugins": [
      ["expo-modules", { "inlineModules": ["./modules"] }]
    ]
  }
}
```

```bash
npx expo prebuild
```

Then create Swift/Kotlin files in `./modules/`:

```swift
// modules/MyCounter.swift
import ExpoModulesCore

public class MyCounter: Module {
  public func definition() -> ModuleDefinition {
    Name("MyCounter")
    AsyncFunction("increment") { (value: Int) in
      return value + 1
    }
  }
}
```

### Auto-Generated TypeScript

```bash
npx expo-type-information module-interface
```

This generates `[ModuleName]Types.ts`, `[ModuleName]Module.ts`, `[ModuleName]View.tsx`, and `index.ts` next to your Swift file. Edit the `stable` file to customize; the `generated` file regenerates on each run.

```tsx
// ---- DON'T: Manual TypeScript Interface ----
// You wrote this by hand and it drifted from the Swift declaration
interface MyCounter {
  increment(value: number): Promise<number>;
}

// ---- DO: Auto-Generated Types ----
import MyCounter from './modules/MyCounter'; // Types match Swift exactly
const result = await MyCounter.increment(5);
```

### Limitations
- Module name must match the file name it's defined in.
- Module names must be globally unique (global object retrieval).
- Some Swift types may not resolve — use the `stable` file to manually type those.

---

## 4. Performance: Faster Native Builds

### iOS: Precompiled XCFrameworks (Default)

Ships prebuilt XCFrameworks for complex Expo modules. Cuts median clean iOS build by **~1 minute (~16%)**.

```bash
# Opt-out only for debugging native module issues:
EXPO_USE_PRECOMPILED_MODULES=0 npx expo run:ios
```

### Android: Precompiled Headers (Experimental)

```json
{
  "expo": {
    "plugins": [
      ["expo-build-properties", { "android": { "usePrecompiledHeaders": true } }]
    ]
  }
}
```

Benchmarks: `:app:buildCMakeDebug` from **17m 10s → 6m 06s (2.81x speedup)**.

### Android: Kotlin Compiler Plugin (No App Changes)

New plugin replaces runtime reflection with build-time binding generation:
- **~40% faster cold starts** (Activity.onCreate: 55ms vs 93ms)
- **~33% faster first render**
- **Time to Interactive: 797ms → 531ms**
- Runs automatically — no code changes required.

### Hermes V1 (Default)

```json
// Opt-out only if absolutely necessary:
{
  "expo": {
    "plugins": [
      ["expo-build-properties", { "useHermesV1": false }]
    ]
  }
}
```

### Hermes Bytecode Diffing (Default)

Binary patches instead of full bundles. Average diff: **58% smaller**.

```json
{
  "expo": {
    "updates": {
      "enableBsdiffPatchSupport": true
    }
  }
}
```

---

## 5. SDK 55 Foundation (Required Before 56)

SDK 55 laid the groundwork. These changes carry forward:

- **Legacy Architecture dropped.** `newArchEnabled` removed. New Architecture is mandatory.
- **Unified SDK versioning.** All Expo packages use the same major version (e.g., `^55.0.0` → `^56.0.0`).
- **New default template** uses Native Tabs API and `/src` folder structure.
- **Expo Router v55 features** that carry into v56:
  - Colors API (Material 3 dynamic styles on Android, adaptive colors on iOS)
  - Apple Zoom transition (interactive shared element on iOS)
  - Stack.Toolbar API (iOS)
  - Experimental SplitView (Android)
  - Form sheet footers (Android)
  - Default safe area handling in native-tabs layouts
  - Synchronous layout updates by default

---

## 6. Anti-Patterns to Fix Immediately

1. **Importing from `@react-navigation/*`:** Dead in SDK 56. Use `expo-router/react-navigation` or the codemod.
2. **Using Expo Go for development:** SDK 56 Expo Go is not on the App Store. Use dev builds.
3. **Community library bloat:** If Expo UI has a drop-in replacement, use it. Every extra native module is a build-time tax.
4. **Manual TypeScript for native modules:** Use `expo-type-information`. Hand-written interfaces drift.
5. **Still on Legacy Architecture:** Mandatory New Architecture since SDK 55. No opt-out.
6. **Using `expo/fetch`:** Removed. Use `globalThis.fetch`.
7. **Full OTA bundles:** Hermes bytecode diffing is on by default. Don't ship 58% more than necessary.
8. **Missing `AGENTS.md`:** SDK 6+ projects should ship AI agent config files. Use the Expo skills repo for Claude Code integration.
9. **Ignoring precompiled modules:** iOS builds are 16% faster by default. Only opt-out for native debugging.
10. **Using `@expo/vector-icons`:** Deprecated. Migrate to `@react-native-vector-icons/*`.

---

## Migration Execution Checklist

1. Create a branch. Never upgrade main directly.
2. Adopt New Architecture on SDK 54 first if not already. Test thoroughly.
3. Upgrade to SDK 56: `npx expo install expo@^56.0.0 --fix`
4. Run `npx expo-doctor` to catch version mismatches.
5. Run the React Navigation import codemod.
6. Run the vector icons codemod.
7. Audit `package.json` for community packages that Expo UI replaces. Remove them.
8. Set up inline modules if you have custom native code.
9. Run `npx expo-type-information` for auto-generated TS interfaces.
10. Regenerate native projects: `rm -rf ios android && npx expo prebuild`
11. Test builds on both platforms: `npx expo run:ios` && `npx expo run:android`
12. Verify Hermes V1 is default. Check bytecode diffing is enabled.
13. Add `AGENTS.md` and `CLAUDE.md` to project root.
14. Update CI/CD to use dev builds instead of Expo Go.
