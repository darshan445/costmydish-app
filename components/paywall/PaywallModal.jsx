import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SubscriptionLegalNotice } from '../ui/LegalLinks';
import { getHobbyistPackages, purchasePackage, restorePurchases, identifyRevenueCatUser } from '../../lib/revenuecat';
import useAuthStore from '../../stores/authStore';
import useSubscriptionStore from '../../stores/subscriptionStore';
import {
  HOBBYIST_ANNUAL_PER_MONTH_USD,
  HOBBYIST_ANNUAL_USD,
  HOBBYIST_MONTHLY_USD,
} from '../../constants/subscription';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';

function formatUsd(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const FEATURES = [
  { icon: 'infinite-outline', text: 'Unlimited recipes' },
  { icon: 'leaf-outline', text: 'Unlimited ingredients' },
  { icon: 'trending-up-outline', text: 'Ingredient price history' },
  { icon: 'cloud-outline', text: 'Cloud sync across devices' },
];

const REASON_TEXT = {
  recipe: "You've reached the 5 recipe limit on the free plan.",
  ingredient: "You've reached the 20 ingredient limit on the free plan.",
  priceHistory: 'Price history is a Hobbyist feature.',
  upgrade: 'Unlock unlimited recipes, price history, and more.',
};

export function PaywallModal({ visible, onClose, reason = 'upgrade' }) {
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const userId = useAuthStore((s) => s.user?.id);

  const [billing, setBilling] = useState('monthly');
  const [packages, setPackages] = useState({ monthly: null, annual: null });
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const isAnnual = billing === 'annual';

  // Fetch offerings when modal opens
  useEffect(() => {
    if (visible) {
      getHobbyistPackages().then(setPackages);
    }
  }, [visible]);

  const selectedPkg = isAnnual ? packages.annual : packages.monthly;

  // Plan prices are always displayed in USD (store may bill in local currency).
  const monthlyPriceStr = formatUsd(HOBBYIST_MONTHLY_USD);
  const annualPriceStr = formatUsd(HOBBYIST_ANNUAL_USD);
  const annualPerMonthStr = `${formatUsd(HOBBYIST_ANNUAL_PER_MONTH_USD)}/mo`;

  const handleSubscribe = async () => {
    if (!selectedPkg) {
      Alert.alert('Not Available', 'Subscription packages could not be loaded. Please try again.');
      return;
    }
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in before subscribing.');
      return;
    }
    setPurchasing(true);
    try {
      // Must finish logIn before purchase so customer appears under Supabase UUID in dashboard
      await identifyRevenueCatUser(userId);
      const result = await purchasePackage(selectedPkg);

      if (result.success) {
        useSubscriptionStore.getState().setRcEntitled(true);
        await fetchProfile(userId);
        Alert.alert(
          'Welcome to Hobbyist!',
          'Unlimited recipes, ingredients, and price history are now unlocked.',
          [{ text: 'Great!', onPress: onClose }],
        );
      } else if (!result.cancelled) {
        Alert.alert('Purchase Failed', result.error ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in before restoring purchases.');
      return;
    }
    setRestoring(true);
    await identifyRevenueCatUser(userId);
    const result = await restorePurchases();
    setRestoring(false);

    if (result.success) {
      useSubscriptionStore.getState().setRcEntitled(true);
      if (userId) await fetchProfile(userId);
      Alert.alert('Restored', 'Your Hobbyist subscription has been restored.', [
        { text: 'OK', onPress: onClose },
      ]);
    } else {
      Alert.alert('Nothing to Restore', 'No active subscription found for this account.');
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Upgrade to Hobbyist"
      scrollable={false}
      footer={(
        <>
          <Button
            title={purchasing ? 'Processing…' : `Subscribe · ${isAnnual ? annualPriceStr + '/yr' : monthlyPriceStr + '/mo'}`}
            onPress={handleSubscribe}
            loading={purchasing}
            size="lg"
          />
          <Button title="Maybe later" onPress={onClose} variant="ghost" size="md" />
          <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
            <Text style={styles.restoreText}>{restoring ? 'Restoring…' : 'Restore purchases'}</Text>
          </TouchableOpacity>
          <SubscriptionLegalNotice />
        </>
      )}
    >
      <Text style={styles.reason}>{REASON_TEXT[reason] ?? REASON_TEXT.upgrade}</Text>

      {/* Billing toggle */}
      <View style={styles.toggleWrap}>
        <TouchableOpacity
          style={[styles.toggleBtn, !isAnnual && styles.toggleActive]}
          onPress={() => setBilling('monthly')}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleText, !isAnnual && styles.toggleTextActive]}>Monthly</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, isAnnual && styles.toggleActive]}
          onPress={() => setBilling('annual')}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleText, isAnnual && styles.toggleTextActive]}>Annual</Text>
          {!isAnnual && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>Save 33%</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Plan card */}
      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planName}>Hobbyist</Text>
            {isAnnual && (
              <Text style={styles.planSub}>{annualPerMonthStr} · billed annually</Text>
            )}
          </View>
          <View style={styles.priceWrap}>
            <Text style={styles.planPrice}>{isAnnual ? annualPriceStr : monthlyPriceStr}</Text>
            <Text style={styles.planPricePer}>{isAnnual ? '/yr' : '/mo'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {FEATURES.map((f) => (
          <View key={f.text} style={styles.featureRow}>
            <Ionicons name={f.icon} size={16} color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      {isAnnual && (
        <View style={styles.savingsBanner}>
          <Ionicons name="pricetag-outline" size={14} color={COLORS.primary} />
          <Text style={styles.savingsBannerText}>You save ~$20 per year vs monthly</Text>
        </View>
      )}

    </Modal>
  );
}

const styles = StyleSheet.create({
  reason: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },

  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.md,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  toggleActive: {
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },
  toggleTextActive: { color: COLORS.text },
  savingsBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  savingsText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.primary },

  planCard: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    backgroundColor: '#F0FDF4',
    marginBottom: SPACING.sm,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  planName: { fontSize: FONT_SIZE.md, fontWeight: '800', color: COLORS.primaryDark },
  planSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  priceWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  planPrice: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.primary },
  planPricePer: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  divider: { height: 1, backgroundColor: '#BBF7D0', marginBottom: SPACING.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  featureText: { fontSize: FONT_SIZE.sm, color: COLORS.primaryDark, fontWeight: '500' },

  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  savingsBannerText: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600' },

  cta: { marginTop: SPACING.xs, marginBottom: SPACING.sm },

  restoreBtn: { alignItems: 'center', paddingVertical: SPACING.sm, marginTop: SPACING.xs },
  restoreText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
});
