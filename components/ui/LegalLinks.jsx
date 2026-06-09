import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { PRIVACY_POLICY_URL, TERMS_URL } from '../../constants/legal';
import { COLORS, FONT_SIZE, SPACING } from '../../constants/theme';

async function openUrl(url) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Could not open link', 'Please try again later.');
  }
}

function LinkText({ children, url }) {
  return (
    <Text style={styles.link} onPress={() => openUrl(url)}>
      {children}
    </Text>
  );
}

export function SignupLegalNotice() {
  return (
    <Text style={styles.text}>
      By creating an account, you agree to our{' '}
      <LinkText url={TERMS_URL}>Terms of Service</LinkText>
      {' '}and{' '}
      <LinkText url={PRIVACY_POLICY_URL}>Privacy Policy</LinkText>.
    </Text>
  );
}

export function SubscriptionLegalNotice() {
  return (
    <View style={styles.subscriptionWrap}>
      <Text style={styles.disclaimer}>
        Payment is charged to your App Store or Google Play account. Your subscription renews
        automatically unless you cancel at least 24 hours before the end of the current period.
        Manage or cancel in your device subscription settings.
      </Text>
      <Text style={styles.text}>
        By subscribing, you agree to our{' '}
        <LinkText url={TERMS_URL}>Terms of Service</LinkText>
        {' '}and{' '}
        <LinkText url={PRIVACY_POLICY_URL}>Privacy Policy</LinkText>.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  subscriptionWrap: { marginTop: SPACING.sm },
  text: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  disclaimer: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  link: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
