import { cn } from 'heroui-native';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

type SafeArea = 'top' | 'bottom' | 'both' | 'none';

interface ScrollScreenProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  safeArea?: SafeArea;
}

const topSafeStyles: Record<SafeArea, string> = {
  top: 'pt-safe-offset-1',
  bottom: '',
  both: 'pt-safe-offset-1',
  none: '',
};

const bottomSafeStyles: Record<SafeArea, string> = {
  top: 'pb-safe-offset-4',
  bottom: 'pb-safe-offset-24',
  both: 'pb-safe-offset-24',
  none: 'pb-safe-offset-4',
};

export function ScrollScreen({
  children,
  className,
  contentClassName,
  safeArea = 'top',
}: ScrollScreenProps) {
  return (
    <View className={cn('flex-1 px-safe bg-background', topSafeStyles[safeArea])}>
      <KeyboardAwareScrollView
        className={className}
        contentContainerClassName={cn(contentClassName, bottomSafeStyles[safeArea])}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        {children}
      </KeyboardAwareScrollView>
    </View>
  );
}
