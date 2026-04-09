---
name: expo-bottom-sheets
description: >
  Bottom sheet implementation patterns for Expo + React Native. Use when building modals, sheets, bottom sheets, form sheets, or any overlay presentation. Triggers on "bottom sheet", "modal", "form sheet", "overlay", "sheet presentation", or "gorhom". Enforces the Dual-Engine Mandate, correct z-index via Portals, and the NativeWind exception for BottomSheetScrollView.
---

# Expo Bottom Sheets

Bottom sheets are the #1 source of z-index bugs, safe-area glitches, and styling failures in React Native. Developers use the wrong engine for the wrong task, forget React Portals, and break layouts by passing Tailwind classes into incompatible 3rd-party ScrollViews.

This skill enforces the Dual-Engine Mandate, proper z-index isolation, and correct keyboard/safe-area handling for both Expo Router formSheet and HeroUI/Gorhom controlled sheets.

## DO / DON'T Quick Reference

| DO (The Modern Standard) | DON'T (Legacy React Native) | Why |
|---|---|---|
| Use Expo Router `formSheet` for URL-driven heavy flows | Use HeroUI BottomSheet for full-page forms | formSheet is native, supports deep linking, and handles iOS chrome natively. |
| Use HeroUI `<BottomSheet>` for state-driven in-context actions | Use formSheet for quick toggles or pickers | HeroUI sheets can be embedded anywhere, controlled via state, and don't change routes. |
| Wrap formSheet screens in `<BottomSheetScreen>` | Add manual top padding or grabber spacing | BottomSheetScreen handles safe area, grabber space, and consistent styling. |
| Use `<BottomSheet.Portal>` for all HeroUI sheets | Render BottomSheet inline without Portal | Portals escape z-index wars and ensure sheets render above all other content. |
| Use explicit snap points (`snapPoints={['80%']}`) | Use dynamic snap points or no snap points | Explicit snap points prevent unpredictable sheet behavior. |
| Use StyleSheet.create() for BottomSheetScrollView contentContainerStyle | Pass NativeWind className to BottomSheetScrollView | NativeWind class forwarding fails on this specific component. Use the Styling Exception. |
| Handle bottom safe areas via `pb-safe` or `<ScrollScreen safeArea="bottom">` | Ignore bottom safe area inside sheets | Without proper bottom padding, interactive elements get hidden behind the home indicator. |

## Execution Protocol

When instructed to build a bottom sheet:

### 1. Choose the Engine

| Scenario | Engine |
|----------|--------|
| Full-page form, multi-step wizard, heavy data entry | Expo Router `formSheet` |
| Quick action, picker, in-context toggle, contextual menu | HeroUI `<BottomSheet>` |

**The rule:** If you need deep linking, URL state restoration, or it's a complete screen — use formSheet. If it's a temporary UI overlay that doesn't change routes — use HeroUI.

### 2. Expo Router formSheet Implementation

**Step 1: Configure in _layout.tsx**

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="feedback"
        options={{
          presentation: 'formSheet',
          headerShown: false,
          sheetGrabberVisible: true,
          contentStyle: {
            backgroundColor: '#fefefe',
          },
        }}
      />
    </Stack>
  );
}
```

**Step 2: Wrap in BottomSheetScreen**

```tsx
// app/feedback.tsx
import { BottomSheetScreen } from '@/components/layout/bottom-sheet-screen';

export default function FeedbackSheet() {
  return (
    <BottomSheetScreen>
      <Text className="text-lg font-bold mb-4">Send Feedback</Text>
      <TextInput 
        placeholder="Your message..."
        className="border border-gray-300 rounded-lg p-3 min-h-[150]"
      />
    </BottomSheetScreen>
  );
}
```

**Key options:**
- `presentation: 'formSheet'` — Activates native iOS formSheet
- `sheetGrabberVisible: true` — Shows the grabber handle
- `sheetAllowedDetents` — Set snap points (e.g., `[0.5, 0.8, 1]`)
- `contentStyle: { backgroundColor: '#fefefe' }` — Required for proper content sizing on iOS 26+

### 3. HeroUI/Gorhom Implementation

**Step 1: Controlled Component Pattern**

```tsx
// components/ui/filter-sheet.tsx
import { useState } from 'react';
import { BottomSheet, Button } from '@heroui/react';
import { View, Text, StyleSheet } from 'react-native';

export function FilterSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onPress={() => setIsOpen(true)}>Open Filters</Button>
      
      <BottomSheet.Portal>
        <BottomSheet
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          snapPoints={['60%']}
          index={0}
          enablePanDownToClose
        >
          <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
            <Text className="text-lg font-bold mb-4">Filters</Text>
            {/* Filter options */}
          </BottomSheetScrollView>
        </BottomSheet>
      </BottomSheet.Portal>
    </>
  );
}
```

**Step 2: The Styling Exception**

```tsx
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 34, // Manual bottom safe area
  },
});
```

**Why this exception exists:** The HeroUI/Gorhom `BottomSheetScrollView` does not forward NativeWind className to its content container. You MUST use `StyleSheet.create()` for `contentContainerStyle`.

**Step 3: Handle Bottom Safe Area**

```tsx
// Option A: Manual padding with pb-safe utility
<BottomSheetScrollView 
  contentContainerClassName="pb-safe"
  contentContainerStyle={styles.sheetContent}
>

// Option B: Wrap in ScrollScreen with safeArea="bottom"
<BottomSheet.Portal>
  <BottomSheet snapPoints={['60%']}>
    <ScrollScreen safeArea="bottom">
      {/* Content */}
    </ScrollScreen>
  </BottomSheet>
</BottomSheet.Portal>
```

## The Edge Cases / Anti-Patterns

**Never use formSheet for quick in-context actions:**

If you need a sheet that appears over the current screen (e.g., a color picker, language selector), formSheet will create a new route and break the user's navigation flow. Use HeroUI BottomSheet instead.

**Never render BottomSheet without Portal:**

Without `<BottomSheet.Portal>`, the sheet renders in the normal view hierarchy. This causes z-index issues when the sheet needs to appear above modals, drawers, or other overlays. The Portal ensures the sheet renders at the top of the tree.

**Never use dynamic snap points:**

Code like `snapPoints={[height * 0.5]}` causes the sheet to recalculate on every render, leading to janky animations. Always use static percentage strings: `snapPoints={['50%', '80%']}`.

**Never ignore iOS 26 liquid glass defaults:**

On iOS 26 with liquid glass enabled, formSheet defaults to transparent background and header. If you need the previous opaque behavior, explicitly set:

```tsx
options={{
  headerTransparent: false,
  contentStyle: {},
  headerShadowVisible: true,
}}
```

**Nested sheets:**

If you need a sheet inside another sheet, the inner sheet must also use Portal. Stacking more than 2 sheets deep is not recommended — consider using a different navigation pattern.

**Android back gesture:**

HeroUI BottomSheet does not automatically handle Android's system back gesture. You must wire `onOpenChange` to `router.back()` or use the `useReactNavigationBackHandler` hook from react-native-keyboard-controller.