---
name: expo-heroui-architecture
description: >
  The absolute foundation for Expo + NativeWind + HeroUI mobile projects. Use when scaffolding new screens, setting up routing, configuring providers, styling React Native components, or building custom navigation. Triggers on "new screen", "expo layout", "safe area", "keyboard avoiding", "mobile styling", "nativewind", "heroui", "custom tabs", or "tab bar". Enforces strict separation of routing and UI, custom keyboard controllers, zero inline styles, and custom tab architecture.
---

# Expo & HeroUI Mobile Architecture

React Native allows for infinite flexibility, which is exactly why most mobile codebases devolve into spaghetti. Developers mix routing logic with UI layouts, manually calculate safe areas, fight the Android keyboard with inline padding, scatter `StyleSheet.create()` across 50 files, and hardcode tab names instead of building generalized navigation.

This skill enforces a locked-down, highly disciplined mobile architecture. We rely on NativeWind utilities for safe areas, a dedicated 3rd-party controller for keyboards, a strict folder boundary between the Expo Router and the actual Screen UI, and a generalized custom tabs pattern that works for N routes.

## DO / DON'T Quick Reference

| DO (The Modern Standard) | DON'T (Legacy React Native) | Why |
|---|---|---|
| Use `react-native-keyboard-controller` (`KeyboardAwareScrollView`) | Use React Native's built-in `KeyboardAvoidingView` | The native RN keyboard component is notoriously buggy on Android and requires manual offset calculations. |
| Apply safe areas via NativeWind utilities (`px-safe`, `pt-safe-offset-1`) | Wrap screens in `<SafeAreaView>` from `react-native-safe-area-context` | Using CSS-based safe areas integrates seamlessly with Tailwind layouts and prevents "double padding" nested views. |
| Use the centralized `Screen` or `ScrollScreen` layout wrappers | Write raw `<View className="flex-1">` in route files | Wrappers guarantee consistent background colors, insets, and keyboard handling across the entire app. |
| Keep `app/` files under 20 lines (Routing only) | Put UI logic, state, and API calls inside `app/` route files | The Expo Router is a wiring layer. Complex UI belongs in `src/components/screens/`. |
| Use `tailwind-variants` (`tv()`) and `cn()` for styling | Write `StyleSheet.create()` or inline `style={{ ... }}` | Centralizes the design system. Inline styles break the HeroUI theme context. |
| Use Expo Router's headless `expo-router/ui` components for custom tabs | Use the default `<Tabs>` with `tabBarStyle` prop | Headless components give full control over animations, gestures, and the Two-State UI Thread. |
| Generalize tab navigation via `TAB_ORDER` array | Hardcode specific tab names like "wishlist" or "explore" | The pattern must work for any number of routes without modification. |

## Execution Protocol

When instructed to build a new mobile screen, feature, or navigation:

### 1. The Mandatory Reading Rule

**READ the appropriate reference file BEFORE writing any code:**

| Context | Reference File |
|---------|----------------|
| Scaffolding a new screen | `references/layout-wrappers.md` |
| Building or modifying the main navigation (tabs) | `references/custom-tabs.md` |

### 2. The Route Boundary (The Wire)
If you are creating a new route (e.g., `app/(app)/profile.tsx`), this file must only act as a wire. Do not write UI here.
```tsx
// app/(app)/profile.tsx
import { ProfileScreen } from '@/components/screens/profile/profile-screen';

export default function ProfileRoute() {
  // Extract params here, pass to UI component
  return <ProfileScreen />;
}
```

### 3. The Screen Wrapper Mandate
Inside `components/screens/`, every root component MUST be wrapped in one of the approved Layout containers.
* **Static Screens (e.g., Dashboards):** Use `<Screen>`.
* **Forms / Long Content:** Use `<ScrollScreen>`. The `ScrollScreen` automatically handles keyboard avoidance. You do not need to add any keyboard logic.

### 4. Styling Lockdown
* **Zero Custom CSS:** You must not create new `.css` files. `global.css` is the single source of truth imported at `_layout.tsx`.
* **Zero Stylesheets:** You must not use `StyleSheet.create()`.
* **Continuous Corners:** If you need rounded corners on iOS, you must use the exported constant `style={styles.borderCurve}` imported from your constants file, combined with Tailwind `rounded-xl` classes.

### 5. The Provider Hierarchy
If you are modifying `app/_layout.tsx`, you must respect the exact provider order. Do not wrap UI providers outside of the Gesture/SafeArea contexts.
1. `SafeAreaProvider` (Absolute Root)
2. `GestureHandlerRootView`
3. `KeyboardProvider`
4. `HeroUINativeProvider` (UI Theme)
5. `AuthProvider` (Business Logic)

## The Edge Cases / Anti-Patterns

**When NOT to use `<ScrollScreen>`:**
If you are building a screen that relies on a `FlatList`, `SectionList`, or `@shopify/flash-list`, do **NOT** wrap the screen in a `<ScrollScreen>`. Nested virtualized lists inside a standard `ScrollView` will cause massive performance degradation and crash the app. Wrap the screen in a static `<Screen>` and let the `FlashList` handle its own scrolling. 

**Modal / Bottom Sheet Presentation:**
If a screen is presented as a native modal or bottom sheet, it often does not need safe-area top padding because the native OS handles the sheet's inset. Use `<BottomSheetScreen>` or manually override the `safeArea` props to prevent massive gaps at the top of the modal.

**Hardcoded Tab Indices:**
Never write `if (index === 2)` or `case 'explore':`. Always compute the index dynamically from the `TAB_ORDER` array. The custom tabs pattern must be agnostic to the specific route names — only the order matters.