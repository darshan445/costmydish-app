import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { track, AnalyticsEvents } from '../../lib/analytics';
import { COLORS, FONT_SIZE, SPACING } from '../../constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoSection}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>CostMyDish</Text>
          <Text style={styles.tagline}>Know exactly what every dish costs.{'\n'}Price with confidence.</Text>
        </View>

        <View style={styles.features}>
          {[
            { icon: '📊', text: 'Real-time recipe cost breakdown' },
            { icon: '🥕', text: 'Manage your ingredient library' },
            { icon: '💰', text: 'Set the right selling price' },
          ].map(({ icon, text }) => (
            <View key={text} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{icon}</Text>
              <Text style={styles.featureText}>{text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <Button title="Get Started" onPress={() => {
          track(AnalyticsEvents.ONBOARDING_GET_STARTED);
          router.push('/(auth)/signup');
        }} size="lg" style={styles.primaryBtn} />
        <Button
          title="I already have an account"
          onPress={() => {
            track(AnalyticsEvents.ONBOARDING_SIGN_IN_TAPPED);
            router.push('/(auth)/login');
          }}
          variant="ghost"
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: SPACING.md,
  },
  appName: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  tagline: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    width: '100%',
    gap: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    fontWeight: '500',
  },
  actions: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  primaryBtn: {
    width: '100%',
  },
});
