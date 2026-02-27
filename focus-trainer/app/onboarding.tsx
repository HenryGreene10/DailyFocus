import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

const STEP_FADE_MS = Platform.OS === 'ios' ? 320 : 240;

const steps = [
  'Your daily focus practice.',
  'Turn on Do Not Disturb.\nRead a short story. That’s all.',
  'If you leave, the session ends.',
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const stepFade = useRef(new Animated.Value(1)).current;
  const screenFade = useRef(new Animated.Value(1)).current;
  const isTransitioningRef = useRef(false);

  const handleNext = async () => {
    if (isTransitioningRef.current) {
      return;
    }

    const isLast = stepIndex === steps.length - 1;

    if (!isLast) {
      isTransitioningRef.current = true;
      Animated.timing(stepFade, {
        toValue: 0,
        duration: STEP_FADE_MS,
        useNativeDriver: true,
      }).start(() => {
        setStepIndex((prev) => prev + 1);
        Animated.timing(stepFade, {
          toValue: 1,
          duration: STEP_FADE_MS,
          useNativeDriver: true,
        }).start(() => {
          isTransitioningRef.current = false;
        });
      });
      return;
    }

    isTransitioningRef.current = true;
    Animated.timing(screenFade, {
      toValue: 0,
      duration: Platform.OS === 'ios' ? 360 : 280,
      useNativeDriver: true,
    }).start(() => {
      router.replace('/story' as never);
    });
  };

  return (
    <Animated.View style={{ flex: 1, opacity: screenFade }}>
      <Pressable onPress={handleNext} style={styles.container}>
        <View style={styles.content}>
          <View style={styles.titleArea}>
            <Text style={styles.title}>DailyFocus</Text>
          </View>
          <View style={styles.instructionArea}>
            <Animated.Text style={[styles.message, { opacity: stepFade }]}>
              {steps[stepIndex]}
            </Animated.Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
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
  titleArea: {
    alignItems: 'center',
  },
  instructionArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    minHeight: Platform.OS === 'ios' ? 110 : 98,
    width: '100%',
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
    fontSize: Platform.OS === 'ios' ? theme.fontSizes.bodyLarge + 1 : theme.fontSizes.bodyLarge,
    lineHeight: Platform.OS === 'ios' ? 30 : 28,
    textAlign: 'center',
  },
});
