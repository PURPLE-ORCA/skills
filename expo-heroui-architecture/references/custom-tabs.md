# Custom Tabs Architecture

This reference covers the **only pattern** for building custom tab bars in Expo + NativeWind + HeroUI projects. It enforces the Hijack Rule, generalizes across N tabs via `TAB_ORDER`, implements the Two-State UI Thread Architecture, and reserves physical space for nested ScrollViews.

---

## 1. The Hijack Rule

**Enforce overriding the default Expo `<Tabs>` via the `tabBar` render prop.**

Do not use the default React Navigation `<Tabs>` component with `tabBarStyle` or `tabBarIcon`. Instead, hijack the entire tab bar rendering:

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/navigation/custom-tab-bar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    />
  );
}
```

**Why this matters:** The default tab bar does not expose the gesture state needed for the Two-State UI Thread Architecture. Hijacking gives you full control over the render cycle.

---

## 2. Generalization via TAB_ORDER

**Teach the pattern of dynamically mapping `TAB_ORDER` (an array of route names) to `currentIndex`. Do not hardcode specific tab names.**

### The TAB_ORDER Constant

```tsx
// src/constants/navigation.ts
export const TAB_ORDER = ['home', 'search', 'cart', 'profile'] as const;
export type TabRoute = typeof TAB_ORDER[number];
```

### Dynamic Index Computation

```tsx
// Inside CustomTabBar
import { TAB_ORDER, type TabRoute } from '@/constants/navigation';

function getIndexFromRoute(routeName: string): number {
  const index = TAB_ORDER.indexOf(routeName as TabRoute);
  return index >= 0 ? index : 0;
}

function getRouteFromIndex(index: number): string {
  return TAB_ORDER[index] || TAB_ORDER[0];
}
```

### Integration with Expo Router State

```tsx
interface CustomTabBarProps {
  state: TabNavigationState<TabRouter>;
  descriptors: TabDescriptors;
  navigation: NavigationProp<TabParamList>;
}

export function CustomTabBar({ state }: CustomTabBarProps) {
  // React state is ONLY for initial sync
  const [currentIndex, setCurrentIndex] = useState(() => {
    const routeName = state.routes[state.index].name;
    return getIndexFromRoute(routeName);
  });

  // ... rest of implementation
}
```

**The math must work for N tabs.** If you add a new route to `TAB_ORDER`, the entire tab bar must adapt without code changes to the component logic.

---

## 3. The Two-State UI Thread Architecture

This architecture separates the React render cycle from the UI feedback cycle. It prevents frame drops during tab switches by handling animations on the UI thread via Reanimated.

### State Breakdown

| State | Purpose | Thread |
|-------|---------|--------|
| `props.state.index` | Syncs initial value from Expo Router | React (JS) |
| `focusedIndex` (SharedValue) | Immediate tab focus feedback | UI (Native) |
| `indicatorX` (SharedValue) | Animated indicator position | UI (Native) |

### Implementation Pattern

```tsx
import { useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const TAB_COUNT = TAB_ORDER.length;
const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT;

export function CustomTabBar({ state, navigation }: CustomTabBarProps) {
  // Step 1: Sync initial value ONLY
  const [currentIndex, setCurrentIndex] = useState(() => 
    getIndexFromRoute(state.routes[state.index].name)
  );

  // Step 2: Shared values for UI thread
  const focusedIndex = useSharedValue(currentIndex);
  const indicatorX = useSharedValue(currentIndex * TAB_WIDTH);

  // Step 3: Navigation callback (must run on JS thread)
  const scheduleOnRN = (index: number) => {
    const routeName = getRouteFromIndex(index);
    navigation.navigate(routeName);
  };

  // Step 4: Update both states on tab press
  const onTabPress = (index: number) => {
    'worklet';
    focusedIndex.value = withSpring(index, { damping: 15, stiffness: 150 });
    indicatorX.value = withSpring(index * TAB_WIDTH, { damping: 15, stiffness: 150 });
    runOnJS(setCurrentIndex)(index);
    runOnJS(scheduleOnRN)(index);
  };

  // ... render
}
```

### The GestureDetector Pattern

For swipe gestures between tabs:

```tsx
const swipeGesture = Gesture.Pan()
  .onUpdate((event) => {
    'worklet';
    const offset = event.translationX;
    const newIndex = Math.round((indicatorX.value + offset) / TAB_WIDTH);
    const clampedIndex = Math.max(0, Math.min(newIndex, TAB_COUNT - 1));
    focusedIndex.value = clampedIndex;
  })
  .onEnd((event) => {
    'worklet';
    const finalIndex = Math.round(
      (indicatorX.value + event.translationX) / TAB_WIDTH
    );
    const clampedIndex = Math.max(0, Math.min(finalIndex, TAB_COUNT - 1));
    indicatorX.value = withSpring(clampedIndex * TAB_WIDTH);
    focusedIndex.value = clampedIndex;
    runOnJS(setCurrentIndex)(clampedIndex);
    runOnJS(scheduleOnRN)(clampedIndex);
  });

return (
  <GestureDetector gesture={swipeGesture}>
    <View>
      {/* Tab content */}
    </View>
  </GestureDetector>
);
```

**Critical Rule:** `props.state.index` is read-only for initial sync. Never write to `navigation.navigate()` synchronously before the animation completes — this causes the "flash" artifact where the screen switches before the indicator moves.

---

## 4. The Spacer View

**Enforce the physical space reservation behind the absolute-positioned tab bar.**

If you position the tab bar absolutely (`position: absolute`, `bottom: 0`), nested ScrollViews in child screens will be clipped because they don't know about the tab bar's presence. The Spacer View fixes this.

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_TAB_HEIGHT = 80;

export function CustomTabBar() {
  const insets = useSafeAreaInsets();
  const totalHeight = BASE_TAB_HEIGHT + insets.bottom;

  return (
    <View className="absolute bottom-0 left-0 right-0">
      {/* Spacer: reserves physical space */}
      <Animated.View 
        style={{ height: totalHeight, opacity: 0 }}
        pointerEvents="none"
      />
      
      {/* Actual tab bar UI */}
      <View 
        className="absolute bottom-0 left-0 right-0 bg-white"
        style={{ height: BASE_TAB_HEIGHT, paddingBottom: insets.bottom }}
      >
        {/* Tab buttons, indicator, icons */}
      </View>
    </View>
  );
}
```

**Why `opacity: 0`:** The spacer must participate in the layout tree (so ScrollViews can measure it) but must not render visually. Using `opacity: 0` instead of `display: none` ensures the view still affects layout.

---

## 5. Visuals: Skia Path Objects

**Icons must be Skia Path objects for 60fps rendering.**

Do not use `<Image />` or `<Text>` emoji icons. Use `@shopify/react-native-skia` for hardware-accelerated icon rendering.

### Icon Component Pattern

```tsx
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';

interface TabIconProps {
  path: string; // SVG path data
  size?: number;
  color: string;
}

export function TabIcon({ path, size = 24, color }: TabIconProps) {
  const skPath = Skia.Path.MakeFromSVGString(path);
  
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path 
        path={skPath}
        color={color}
        style="fill"
      />
    </Canvas>
  );
}
```

### Common Icon Paths (Pre-defined)

```tsx
// src/constants/icons.ts
export const ICONS = {
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  cart: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
  profile: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
} as const;
```

### Usage in Tab Button

```tsx
import { ICONS } from '@/constants/icons';
import { TabIcon } from '@/components/ui/tab-icon';

function TabButton({ index, isFocused }: { index: number; isFocused: boolean }) {
  const routeName = getRouteFromIndex(index);
  const color = isFocused ? '#000' : '#999';
  
  const iconPath = ICONS[routeName as keyof typeof ICONS];
  
  return (
    <View className="flex-1 items-center justify-center">
      <TabIcon path={iconPath} size={24} color={color} />
    </View>
  );
}
```

---

## 6. Complete Integration Example

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/navigation/custom-tab-bar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBar: (props) => <CustomTabBar {...props} />,
      }}
    />
  );
}
```

```tsx
// components/navigation/custom-tab-bar.tsx
import { useState } from 'react';
import { View, Pressable, Dimensions } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_ORDER } from '@/constants/navigation';
import { ICONS } from '@/constants/icons';
import { TabIcon } from '@/components/ui/tab-icon';
import { Animated } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_COUNT = TAB_ORDER.length;
const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT;
const BASE_TAB_HEIGHT = 80;

export function CustomTabBar({ state, navigation }: CustomTabBarProps) {
  const insets = useSafeAreaInsets();
  const totalHeight = BASE_TAB_HEIGHT + insets.bottom;
  
  const [currentIndex, setCurrentIndex] = useState(
    () => TAB_ORDER.indexOf(state.routes[state.index].name as any)
  );
  
  const focusedIndex = useSharedValue(currentIndex);
  const indicatorX = useSharedValue(currentIndex * TAB_WIDTH);

  const onTabPress = (index: number) => {
    'worklet';
    focusedIndex.value = withSpring(index);
    indicatorX.value = withSpring(index * TAB_WIDTH);
    setCurrentIndex(index);
    navigation.navigate(TAB_ORDER[index]);
  };

  const swipeGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      const offset = e.translationX;
      const newIndex = Math.round((indicatorX.value + offset) / TAB_WIDTH);
      focusedIndex.value = Math.max(0, Math.min(newIndex, TAB_COUNT - 1));
    })
    .onEnd((e) => {
      'worklet';
      const finalIndex = Math.round(
        (indicatorX.value + e.translationX) / TAB_WIDTH
      );
      const clamped = Math.max(0, Math.min(finalIndex, TAB_COUNT - 1));
      indicatorX.value = withSpring(clamped * TAB_WIDTH);
      focusedIndex.value = clamped;
      setCurrentIndex(clamped);
      navigation.navigate(TAB_ORDER[clamped]);
    });

  return (
    <View className="absolute bottom-0 left-0 right-0">
      {/* Spacer */}
      <Animated.View 
        style={{ height: totalHeight, opacity: 0 }} 
        pointerEvents="none" 
      />
      
      {/* Tab Bar */}
      <GestureDetector gesture={swipeGesture}>
        <View 
          className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200"
          style={{ 
            height: BASE_TAB_HEIGHT, 
            paddingBottom: insets.bottom 
          }}
        >
          {/* Indicator */}
          <Animated.View
            className="absolute bottom-0 bg-primary-500"
            style={{
              width: TAB_WIDTH,
              height: 3,
              transform: [{ translateX: indicatorX }],
            }}
          />
          
          {/* Tab Buttons */}
          <View className="flex-row flex-1">
            {TAB_ORDER.map((route, index) => (
              <Pressable
                key={route}
                className="flex-1 items-center justify-center"
                onPress={() => onTabPress(index)}
              >
                <TabIcon 
                  path={ICONS[route as keyof typeof ICONS]} 
                  size={24}
                  color={currentIndex === index ? '#000' : '#999'}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}
```

---

## The Edge Cases

**When NOT to use this pattern:**

1. **Static tab bars with no animations:** If you need a simple, static tab bar with no gesture support or custom animations, use the default `expo-router/ui` headless components (`TabList`, `TabTrigger`) without Reanimated. The Two-State Architecture adds overhead that only pays off for animated/gesture-rich tab bars.

2. **Platform-specific tab bars:** If the design differs drastically between iOS and Android (e.g., Android uses a top tab bar), create separate components and use `Platform.select()` in the `_layout.tsx`.

3. **Nested tab groups:** If you have tabs inside tabs (e.g., bottom tabs + nested stack tabs), the spacer calculation becomes complex. You may need to use `tabBarTablet` or custom layout strategies instead.

4. **RTL layouts:** This pattern assumes LTR. For RTL languages (Arabic, Hebrew), you must mirror the indicator animation and reverse the swipe gesture direction.

**Never hardcode indices like `if (index === 2)` or switch statements on route names.** The `TAB_ORDER` array is the single source of truth. Add routes only by appending to `TAB_ORDER`.