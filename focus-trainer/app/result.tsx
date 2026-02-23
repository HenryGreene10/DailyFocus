import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ outcome?: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{params.outcome === 'completed' ? 'Completed' : 'Failed'}</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#0b0f14',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    color: '#f4f7fb',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#e7edf5',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  buttonText: {
    color: '#0f1720',
    fontSize: 16,
    fontWeight: '600',
  },
});
