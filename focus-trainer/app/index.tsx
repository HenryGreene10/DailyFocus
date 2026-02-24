import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

let hasShownLaunchOnboarding = false;

const CORNERS = [
  { key: 'tl', style: { top: theme.spacing.xl, left: theme.spacing.xl } },
  { key: 'tr', style: { top: theme.spacing.xl, right: theme.spacing.xl } },
  { key: 'bl', style: { bottom: theme.spacing.xl, left: theme.spacing.xl } },
  { key: 'br', style: { bottom: theme.spacing.xl, right: theme.spacing.xl } },
] as const;

export default function WelcomeScreen() {
  const router = useRouter();
  const [showHome, setShowHome] = useState(hasShownLaunchOnboarding);

  useEffect(() => {
    if (!hasShownLaunchOnboarding) {
      hasShownLaunchOnboarding = true;
      router.replace('/onboarding' as never);
      return;
    }

    setShowHome(true);
  }, [router]);

  if (!showHome) {
    return <View style={styles.container} />;
  }

  return (
    <Pressable onPress={() => router.push('/story' as never)} style={styles.container}>
      {CORNERS.map((corner) => (
        <Text key={corner.key} style={[styles.cornerStar, corner.style]}>
          ✦
        </Text>
      ))}

      <View style={styles.centerContent}>
        <Text style={styles.title}>DailyFocus</Text>
        <Text style={styles.subtitle}>tap to begin your practice</Text>
      </View>
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
  },
  cornerStar: {
    color: theme.colors.accentLight,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.bodyLarge,
    opacity: 0.3,
    position: 'absolute',
  },
});
