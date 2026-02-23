import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { getStories } from '@/src/content/storyPack';
import { sessionService } from '@/src/services/SessionService';
import { Button } from '@/src/ui/components/Button';
import { Screen } from '@/src/ui/components/Screen';
import { Text } from '@/src/ui/components/Text';
import { theme } from '@/src/ui/theme';

export default function HomeScreen() {
  const router = useRouter();
  const story = getStories()[0];

  const handleStart = () => {
    sessionService.startSession(story.id);
    router.push({ pathname: '/session', params: { storyId: story.id } });
  };

  return (
    <Screen style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.center} variant="title">
          Focus Story Trainer
        </Text>
        <Text style={styles.center}>One story. No pause. Stay in the app until the end.</Text>
      </View>
      <Button onPress={handleStart}>Start</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
  },
  content: {
    gap: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  center: {
    textAlign: 'center',
  },
});
