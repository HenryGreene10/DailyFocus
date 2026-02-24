import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

const ONBOARDED_KEY = 'dailyfocus_onboarded_v1';

const CORNERS = [
  { key: 'tl', style: { top: theme.spacing.xl, left: theme.spacing.xl } },
  { key: 'tr', style: { top: theme.spacing.xl, right: theme.spacing.xl } },
  { key: 'bl', style: { bottom: theme.spacing.xl, left: theme.spacing.xl } },
  { key: 'br', style: { bottom: theme.spacing.xl, right: theme.spacing.xl } },
] as const;

export default function WelcomeScreen() {
  const router = useRouter();
  const suppressNextStartRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkOnboarding() {
      const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY);

      if (!isMounted) {
        return;
      }

      if (onboarded !== 'true') {
        router.replace('/onboarding' as never);
        return;
      }

      setReady(true);
    }

    checkOnboarding();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (!ready) {
    return <View style={styles.container} />;
  }

  const handleStart = () => {
    if (suppressNextStartRef.current) {
      suppressNextStartRef.current = false;
      return;
    }

    router.push('/story' as never);
  };

  const handleDevReset = async () => {
    if (!__DEV__) {
      return;
    }

    suppressNextStartRef.current = true;
    await AsyncStorage.setItem(ONBOARDED_KEY, 'false');
    router.replace('/onboarding' as never);
  };

  return (
    <Pressable onPress={handleStart} style={styles.container}>
      {CORNERS.map((corner) => (
        <Text key={corner.key} style={[styles.cornerStar, corner.style]}>
          ✦
        </Text>
      ))}

      <View style={styles.centerContent}>
        <Pressable delayLongPress={2000} onLongPress={__DEV__ ? handleDevReset : undefined}>
          <Text style={styles.title}>DailyFocus</Text>
        </Pressable>
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
