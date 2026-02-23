import { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/src/ui/components/Text';
import { theme } from '@/src/ui/theme';

interface ButtonProps {
  children: ReactNode;
  disabled?: boolean;
  onPress: () => void;
}

export function Button({ children, disabled = false, onPress }: ButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}>
      <Text style={disabled ? styles.textDisabled : styles.text} variant="label">
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.buttonBg,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.buttonDisabledBg,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  text: {
    color: theme.colors.buttonText,
  },
  textDisabled: {
    color: theme.colors.buttonDisabledText,
  },
});
