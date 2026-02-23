import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

const CORNERS = [
  { key: 'tl', style: { top: theme.spacing.xl, left: theme.spacing.xl } },
  { key: 'tr', style: { top: theme.spacing.xl, right: theme.spacing.xl } },
  { key: 'bl', style: { bottom: theme.spacing.xl, left: theme.spacing.xl } },
  { key: 'br', style: { bottom: theme.spacing.xl, right: theme.spacing.xl } },
] as const;

export default function WelcomeScreen() {
  const router = useRouter();
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.8,
          duration: 1250,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 1250,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse]);

  return (
    <Pressable onPress={() => router.push('/story' as never)} style={styles.container}>
      {CORNERS.map((corner) => (
        <Text key={corner.key} style={[styles.cornerStar, corner.style]}>
          ✦
        </Text>
      ))}

      <View style={styles.centerContent}>
        <Text style={styles.title}>DailyFocus</Text>
        <Text style={styles.subtitle}>your daily story awaits</Text>
      </View>

      <Animated.Text style={[styles.hint, { opacity: pulse }]}>tap anywhere to begin</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    flex: 1,
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.cormorantLight,
    fontSize: theme.fontSizes.hero,
    fontWeight: '300',
    letterSpacing: 2,
  },
  subtitle: {
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.body,
    letterSpacing: 3,
    marginTop: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  hint: {
    bottom: theme.spacing.lg,
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.body,
    letterSpacing: 3,
    position: 'absolute',
    textTransform: 'uppercase',
  },
  cornerStar: {
    color: theme.colors.accentLight,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.bodyLarge,
    opacity: 0.3,
    position: 'absolute',
  },
});
