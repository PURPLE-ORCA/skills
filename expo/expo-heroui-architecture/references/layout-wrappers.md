# Layout Wrappers Architecture

Every screen in the app must use a centralized layout wrapper. This ensures consistent background colors, safe area handling, keyboard avoidance, and provider contexts across the entire application.

---

## The Wrapper Hierarchy

```
Screen (Static)
  └── Used for: Dashboards, lists, static content
  └── Does NOT handle keyboard

ScrollScreen (Dynamic)
  └── Used for: Forms, long content, any screen with inputs
  └── Automatically handles keyboard avoidance via KeyboardAwareScrollView
  └── DO NOT use with FlatList/SectionList/FlashList

BottomSheetScreen (Modal)
  └── Used for: Bottom sheet presentations
  └── Disables top safe area (native OS handles inset)
```

---

## Screen Wrapper

**For static screens that don't require scrolling.**

```tsx
// components/layout/screen.tsx
import { View, ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export function Screen({ children, className, ...props }: ScreenProps) {
  return (
    <View 
      className={cn('flex-1 bg-background px-safe pt-safe-offset-1', className)}
      {...props}
    >
      {children}
    </View>
  );
}
```

**Usage:**

```tsx
// components/screens/home/home-screen.tsx
import { Screen } from '@/components/layout/screen';

export function HomeScreen() {
  return (
    <Screen>
      {/* Static content: dashboards, lists, etc. */}
    </Screen>
  );
}
```

---

## ScrollScreen Wrapper

**For screens with forms, inputs, or long scrollable content.**

The ScrollScreen automatically handles keyboard avoidance via `react-native-keyboard-controller`'s `KeyboardAwareScrollView`. You do NOT need to add any keyboard logic.

```tsx
// components/layout/scroll-screen.tsx
import { ScrollView, ScrollViewProps } from 'react-native-keyboard-controller';
import { cn } from '@/lib/utils';

interface ScrollScreenProps extends ScrollViewProps {
  children: React.ReactNode;
  className?: string;
}

export function ScrollScreen({ children, className, ...props }: ScrollScreenProps) {
  return (
    <KeyboardAwareScrollView
      className={cn('flex-1 bg-background', className)}
      contentContainerClassName="pt-safe-offset-1 px-safe pb-8"
      keyboardBehavior="interactive"
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
```

**Usage:**

```tsx
// components/screens/settings/settings-screen.tsx
import { ScrollScreen } from '@/components/layout/scroll-screen';

export function SettingsScreen() {
  return (
    <ScrollScreen>
      <Text>Form fields here...</Text>
      <TextInput placeholder="Email" />
      <TextInput placeholder="Password" secureTextEntry />
    </ScrollScreen>
  );
}
```

---

## BottomSheetScreen Wrapper

**For screens presented as bottom sheets or modals where the native OS handles safe area.**

```tsx
// components/layout/bottom-sheet-screen.tsx
import { View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/lib/utils';

interface BottomSheetScreenProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export function BottomSheetScreen({ children, className, ...props }: BottomSheetScreenProps) {
  const insets = useSafeAreaInsets();
  
  return (
    <View 
      className={cn('flex-1 bg-background', className)}
      style={{ paddingBottom: insets.bottom }}
      {...props}
    >
      {children}
    </View>
  );
}
```

**Note:** This wrapper intentionally omits `pt-safe-offset-1` because the native bottom sheet presentation already provides the correct top inset.

---

## Usage in Expo Router

The route file (`app/`) should be a thin wire that imports the screen component:

```tsx
// app/(app)/profile.tsx
import { ProfileScreen } from '@/components/screens/profile/profile-screen';

export default function ProfileRoute() {
  return <ProfileScreen />;
}
```

```tsx
// app/(app)/settings.tsx
import { SettingsScreen } from '@/components/screens/settings/settings-screen';

export default function SettingsRoute() {
  return <SettingsScreen />;
}
```

---

## The Edge Cases

**When NOT to use ScrollScreen:**

1. **FlatList/SectionList/FlashList screens:** If your screen uses a virtualized list, do NOT wrap it in ScrollScreen. Nested virtualized lists inside a ScrollView cause performance degradation and crashes. Use the static `Screen` wrapper and let the list handle its own scrolling.

   ```tsx
   // WRONG
   <ScrollScreen>
     <FlashList data={items} />
   </ScrollScreen>

   // CORRECT
   <Screen>
     <FlashList data={items} />
   </Screen>
   ```

2. **Keyboard-only screens:** If a screen is purely for displaying content (no inputs), use `Screen` instead of `ScrollScreen` to avoid unnecessary keyboard-aware overhead.

**When NOT to use BottomSheetScreen:**

1. **Full-screen modals:** If presenting a full-screen modal (not a bottom sheet), use `Screen` or `ScrollScreen` and manually handle the safe area insets via NativeWind utilities (`pt-safe-offset-1`).

2. **Nested bottom sheets:** If you have a bottom sheet inside another bottom sheet, the safe area calculation becomes complex. Verify visually on both iOS and Android.

**Safe Area Rules:**
- iOS: Always use `pt-safe-offset-1` for top padding (below the notch/dynamic island).
- Android: The `px-safe` utility handles edge-to-edge correctly.
- Never wrap in `<SafeAreaView>` — use NativeWind utilities instead.