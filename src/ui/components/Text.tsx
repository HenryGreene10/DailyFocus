import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text as RNText, TextStyle } from 'react-native';

import { theme } from '@/src/ui/theme';

type TextVariant = 'title' | 'body' | 'label';

interface AppTextProps {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  variant?: TextVariant;
}

const variantStyles = StyleSheet.create<Record<TextVariant, TextStyle>>({
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.title,
    fontWeight: '700',
    lineHeight: 36,
  },
  body: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body,
    fontWeight: '400',
    lineHeight: 30,
  },
  label: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.label,
    fontWeight: '600',
    lineHeight: 22,
  },
});

export function Text({ children, style, variant = 'body' }: AppTextProps) {
  return <RNText style={[variantStyles[variant], style]}>{children}</RNText>;
}
