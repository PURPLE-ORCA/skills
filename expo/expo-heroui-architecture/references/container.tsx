import { View as RNView } from 'react-native';
import { cn } from 'tailwind-variants';

type Spacing = 'none' | 'top' | 'bottom' | 'both';

const spacingStyles: Record<Spacing, string> = {
  none: '',
  top: 'mt-5',
  bottom: 'mb-5',
  both: 'mt-5 mb-5',
};

export function Container({
  children,
  className,
  spacing = 'none',
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  spacing?: Spacing;
  padded?: boolean;
}) {
  return (
    <RNView className={cn(padded && 'px-4', spacingStyles[spacing], className)}>{children}</RNView>
  );
}
