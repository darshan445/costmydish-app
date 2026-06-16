import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SubscriptionLegalNotice } from '../ui/LegalLinks';
import {
  getHobbyistPackages,
  purchasePackage,
  restorePurchases,
  identifyRevenueCatUser,
  fetchHobbyistEntitlementStatus,
} from '../../lib/revenuecat';
import { refreshSubscriptionState } from '../../lib/subscriptionSync';
import { showAppAlert } from '../../lib/appAlert';
import useAuthStore from '../../stores/authStore';
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
  changePlan: 'Switch between monthly and annual billing. Your store account handles proration.',
};

export function PaywallModal({ visible, onClose, reason = 'upgrade', mode = 'upgrade' }) {
  const userId = useAuthStore((s) => s.user?.id);

  const [billing, setBilling] = useState('monthly');
  const [currentBilling, setCurrentBilling] = useState(null);
  const [packages, setPackages] = useState({ monthly: null, annual: null });
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const isChangePlan = mode === 'changePlan';
  const isAnnual = billing === 'annual';
  const isSamePlan = isChangePlan && currentBilling && billing === currentBilling;

  useEffect(() => {
    if (!visible) return;

    getHobbyistPackages().then(setPackages);

    if (isChangePlan) {
      fetchHobbyistEntitlementStatus().then((status) => {
        if (status.billingPeriod) {
          setCurrentBilling(status.billingPeriod);
          setBilling(status.billingPeriod === 'monthly' ? 'annual' : 'monthly');
        } else {
          setCurrentBilling(null);
          setBilling('annual');
        }
      });
    } else {
      setCurrentBilling(null);
      setBilling('monthly');
    }
  }, [visible, isChangePlan]);

  const selectedPkg = isAnnual ? packages.annual : packages.monthly;

  const monthlyPriceStr = formatUsd(HOBBYIST_MONTHLY_USD);
  const annualPriceStr = formatUsd(HOBBYIST_ANNUAL_USD);
  const annualPerMonthStr = `${formatUsd(HOBBYIST_ANNUAL_PER_MONTH_USD)}/mo`;

  const modalTitle = isChangePlan ? 'Change Your Plan' : 'Upgrade to Hobbyist';
  const reasonText = REASON_TEXT[reason] ?? REASON_TEXT.upgrade;

  const subscribeLabel = (() => {
    if (purchasing) return 'Processing…';
    if (isChangePlan) {
      if (isSamePlan) return 'Already on this plan';
      return isAnnual
        ? `Switch to Annual · ${annualPriceStr}/yr`
        : `Switch to Monthly · ${monthlyPriceStr}/mo`;
    }
    return `Subscribe · ${isAnnual ? `${annualPriceStr}/yr` : `${monthlyPriceStr}/mo`}`;
  })();

  const handleSubscribe = async () => {
    if (isSamePlan) return;

    if (!selectedPkg) {
      showAppAlert({
        title: 'Not Available',
        message: 'Subscription packages could not be loaded. Please try again.',
        variant: 'error',
      });
      return;
    }
    if (!userId) {
      showAppAlert({
        title: 'Sign In Required',
        message: 'Please sign in before subscribing.',
        variant: 'warning',
      });
      return;
    }

    setPurchasing(true);
    try {
      await identifyRevenueCatUser(userId);
      const result = await purchasePackage(selectedPkg);

      if (result.success) {
        await refreshSubscriptionState(userId);
        if (isChangePlan) {
          showAppAlert({
            title: 'Plan Updated',
            message: `You're now on the ${isAnnual ? 'annual' : 'monthly'} Hobbyist plan. Billing changes are handled by the App Store or Play Store.`,
            variant: 'success',
            onPrimary: onClose,
          });
        } else {
          showAppAlert({
            title: 'Welcome to Hobbyist!',
            message: 'Unlimited recipes, ingredients, and price history are now unlocked.',
            variant: 'success',
            onPrimary: onClose,
          });
        }
      } else if (!result.cancelled) {
        showAppAlert({
          title: 'Purchase Failed',
          message: result.error ?? 'Something went wrong. Please try again.',
          variant: 'error',
        });
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (!userId) {
      showAppAlert({
        title: 'Sign In Required',
        message: 'Please sign in before restoring purchases.',
        variant: 'warning',
      });
      return;
    }
    setRestoring(true);
    try {
      await identifyRevenueCatUser(userId);
      const result = await restorePurchases();

      if (result.success) {
        await refreshSubscriptionState(userId);
        showAppAlert({
          title: 'Restored',
          message: 'Your Hobbyist subscription has been restored.',
          variant: 'success',
          onPrimary: onClose,
        });
      } else if (result.error) {
        showAppAlert({
          title: 'Restore Failed',
          message: result.error,
          variant: 'error',
        });
      } else {
        showAppAlert({
          title: 'Nothing to Restore',
          message: 'No active subscription found for this account.',
          variant: 'info',
        });
      }
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={modalTitle}
      scrollable={false}
      footer={(
        <>
          <Button
            title={subscribeLabel}
            onPress={handleSubscribe}
            loading={purchasing}
            disabled={isSamePlan}
            size="lg"
          />
          <Button
            title={isChangePlan ? 'Cancel' : 'Maybe later'}
            onPress={onClose}
            variant="ghost"
            size="md"
          />
          {!isChangePlan ? (
            <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
              <Text style={styles.restoreText}>{restoring ? 'Restoring…' : 'Restore purchases'}</Text>
            </TouchableOpacity>
          ) : null}
          <SubscriptionLegalNotice />
        </>
      )}
    >
      <Text style={styles.reason}>{reasonText}</Text>

      {isChangePlan && currentBilling ? (
        <View style={styles.currentPlanBanner}>
          <Ionicons name="card-outline" size={16} color={COLORS.primary} />
          <Text style={styles.currentPlanText}>
            Current plan: {currentBilling === 'annual' ? 'Annual' : 'Monthly'}
          </Text>
        </View>
      ) : null}

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
          {!isAnnual ? (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>Save 33%</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {isSamePlan ? (
        <Text style={styles.samePlanHint}>Select the other billing option to switch plans.</Text>
      ) : null}

      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planName}>Hobbyist</Text>
            {isAnnual ? (
              <Text style={styles.planSub}>{annualPerMonthStr} · billed annually</Text>
            ) : null}
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

      {isAnnual ? (
        <View style={styles.savingsBanner}>
          <Ionicons name="pricetag-outline" size={14} color={COLORS.primary} />
          <Text style={styles.savingsBannerText}>You save ~$20 per year vs monthly</Text>
        </View>
      ) : null}

      {isChangePlan ? (
        <Text style={styles.prorationNote}>
          Plan changes are processed by Apple or Google. You may receive a prorated credit or charge.
        </Text>
      ) : null}
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
  currentPlanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  currentPlanText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  samePlanHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.warning,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  prorationNote: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: SPACING.xs,
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
  restoreBtn: { alignItems: 'center', paddingVertical: SPACING.sm, marginTop: SPACING.xs },
  restoreText: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
});
