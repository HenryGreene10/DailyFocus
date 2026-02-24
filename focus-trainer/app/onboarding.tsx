import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

const ONBOARDED_KEY = 'dailyfocus_onboarded_v1';

const steps = [
  'Tap anywhere to advance',
  'Each passage has a minimum display time',
  'If you leave the app during a story, you fail',
] as const;

const CORNERS = [
  { key: 'tl', style: { top: theme.spacing.xl, left: theme.spacing.xl } },
  { key: 'tr', style: { top: theme.spacing.xl, right: theme.spacing.xl } },
  { key: 'bl', style: { bottom: theme.spacing.xl, left: theme.spacing.xl } },
  { key: 'br', style: { bottom: theme.spacing.xl, right: theme.spacing.xl } },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const pulse = useRef(new Animated.Value(0.3)).current;
  const stepFade = useRef(new Animated.Value(1)).current;
  const isTransitioningRef = useRef(false);

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

  const handleNext = async () => {
    if (isTransitioningRef.current) {
      return;
    }

    const isLast = stepIndex === steps.length - 1;

    if (!isLast) {
      isTransitioningRef.current = true;
      Animated.timing(stepFade, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setStepIndex((prev) => prev + 1);
        Animated.timing(stepFade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start(() => {
          isTransitioningRef.current = false;
        });
      });
      return;
    }

    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    router.replace('/' as never);
  };

  return (
    <Pressable onPress={handleNext} style={styles.container}>
      {CORNERS.map((corner) => (
        <Text key={corner.key} style={[styles.cornerStar, corner.style]}>
          ✦
        </Text>
      ))}

      <View style={styles.content}>
        <Text style={styles.title}>DailyFocus</Text>
        <Animated.Text style={[styles.message, { opacity: stepFade }]}>
          {steps[stepIndex]}
        </Animated.Text>
      </View>

      <Animated.Text style={[styles.hint, { opacity: pulse }]}>tap anywhere to continue</Animated.Text>
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
  content: {
    alignItems: 'center',
    paddingHorizontal: 44,
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.cormorantLight,
    fontSize: theme.fontSizes.hero,
    fontWeight: '300',
    letterSpacing: 2,
  },
  message: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.loraItalic,
    fontSize: theme.fontSizes.bodyLarge,
    lineHeight: 28,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  hint: {
    bottom: theme.spacing.lg,
    color: theme.colors.textFaint,
    fontFamily: theme.fonts.loraRegular,
    fontSize: theme.fontSizes.body,
    letterSpacing: 2,
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
