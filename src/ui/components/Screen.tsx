import { PropsWithChildren } from 'react';
import { SafeAreaView, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { theme } from '@/src/ui/theme';

interface ScreenProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, style }: ScreenProps) {
  return <SafeAreaView style={[styles.container, style]}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    flex: 1,
    padding: theme.spacing.lg,
  },
});
