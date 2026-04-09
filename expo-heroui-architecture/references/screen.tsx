import { cn } from 'heroui-native';
import { View as RNView } from 'react-native';

type SafeArea = 'top' | 'bottom' | 'both' | 'none';

const safeAreaStyles: Record<SafeArea, string> = {
  top: 'pt-safe-offset-1 pb-safe-offset-4',
  bottom: 'pb-safe-offset-24',
  both: 'pt-safe-offset-1 pb-safe-offset-24',
  none: 'pb-safe-offset-4',
};

export function Screen({
  children,
  className,
  safeArea = 'top',
}: {
  children: React.ReactNode;
  className?: string;
  safeArea?: SafeArea;
}) {
  return (
    <RNView className={cn('flex-1 bg-background px-safe', safeAreaStyles[safeArea], className)}>
      {children}
    </RNView>
  );
}
