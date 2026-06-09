import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PaywallModal } from '../components/paywall/PaywallModal';
import { COLORS } from '../constants/theme';

export default function PaywallScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <PaywallModal visible onClose={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
});
