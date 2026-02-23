import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/src/ui/components/Button';
import { Screen } from '@/src/ui/components/Screen';
import { Text } from '@/src/ui/components/Text';
import { theme } from '@/src/ui/theme';

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ outcome?: string; reason?: string }>();

  const completed = params.outcome === 'completed';

  return (
    <Screen style={styles.container}>
      <View style={styles.centered}>
        <Text style={styles.center} variant="title">
          {completed ? 'Completed' : 'Failed'}
        </Text>
        {!completed && params.reason ? (
          <Text style={[styles.center, styles.reason]} variant="label">
            Reason: {params.reason}
          </Text>
        ) : null}
      </View>
      <Button onPress={() => router.replace('/')}>Continue</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
  reason: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
});
