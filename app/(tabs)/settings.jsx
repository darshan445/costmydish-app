import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PaywallModal } from '../../components/paywall/PaywallModal';
import useAuthStore from '../../stores/authStore';
import useSettingsStore from '../../stores/settingsStore';
import useRecipeStore from '../../stores/recipeStore';
import useIngredientStore from '../../stores/ingredientStore';
import { useSubscription } from '../../hooks/useSubscription';
import { identifyRevenueCatUser, openManageSubscriptions, restorePurchases } from '../../lib/revenuecat';
import useSubscriptionStore from '../../stores/subscriptionStore';
import { CURRENCIES } from '../../constants/currencies';
import { UNIT_SYSTEMS } from '../../constants/units';
import { PRIVACY_POLICY_URL, TERMS_URL } from '../../constants/legal';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, deleteAccount, fetchProfile } = useAuthStore();
  const { settings, updateSettings } = useSettingsStore();
  const { tier, isFree, isHobbyist } = useSubscription();
  const recipes = useRecipeStore((s) => s.recipes);
  const fetchRecipes = useRecipeStore((s) => s.fetchRecipes);
  const ingredients = useIngredientStore((s) => s.ingredients);

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showUnitSystemModal, setShowUnitSystemModal] = useState(false);
  const [showCurrencyWarning, setShowCurrencyWarning] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState(null);
  const [showFoodCostModal, setShowFoodCostModal] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [foodCostInput, setFoodCostInput] = useState(String(settings.default_food_cost_percent));
  const [foodCostError, setFoodCostError] = useState('');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [managing, setManaging] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const recipeCount = recipes.length;
  const ingredientCount = ingredients.length;

  useEffect(() => {
    if (user?.id) fetchRecipes();
  }, [user?.id, fetchRecipes]);

  const applyCurrency = async (currency) => {
    setShowCurrencyModal(false);
    setShowCurrencyWarning(false);
    setPendingCurrency(null);
    await updateSettings(user.id, { currency: currency.code, currency_symbol: currency.symbol });
  };

  const handleSelectCurrency = (currency) => {
    if (currency.code === settings.currency) {
      setShowCurrencyModal(false);
      return;
    }

    if (recipeCount > 0) {
      setPendingCurrency(currency);
      setShowCurrencyModal(false);
      setShowCurrencyWarning(true);
      return;
    }

    applyCurrency(currency);
  };

  const handleCancelCurrencyWarning = () => {
    setShowCurrencyWarning(false);
    setPendingCurrency(null);
    setShowCurrencyModal(true);
  };

  const handleSelectUnitSystem = async (system) => {
    if (system.value === settings.unit_system) {
      setShowUnitSystemModal(false);
      return;
    }
    setShowUnitSystemModal(false);
    await updateSettings(user.id, { unit_system: system.value });
  };

  const unitSystemLabel = UNIT_SYSTEMS.find((s) => s.value === settings.unit_system)?.label ?? 'Metric';

  const handleSaveFoodCost = async () => {
    const val = parseFloat(foodCostInput);
    if (isNaN(val) || val <= 0 || val > 100) {
      setFoodCostError('Enter a percentage between 1 and 100.');
      return;
    }
    setFoodCostError('');
    setSaving(true);
    await updateSettings(user.id, { default_food_cost_percent: val });
    setSaving(false);
    setShowFoodCostModal(false);
  };

  const handleRestorePurchases = async () => {
    if (!user?.id) return;
    setRestoring(true);
    try {
      await identifyRevenueCatUser(user.id);
      const result = await restorePurchases();
      if (result.success) {
        useSubscriptionStore.getState().setRcEntitled(true);
        await fetchProfile(user.id);
        Alert.alert('Restored', 'Your Hobbyist subscription has been restored.');
      } else {
        Alert.alert('Nothing to Restore', 'No active subscription found for this account.');
      }
    } finally {
      setRestoring(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user?.id) return;
    setManaging(true);
    try {
      await identifyRevenueCatUser(user.id);
      const result = await openManageSubscriptions();
      if (!result.success) {
        Alert.alert(
          'Manage Subscription',
          result.error ?? 'Could not open subscription settings.',
          [
            { text: 'Restore Purchases', onPress: handleRestorePurchases },
            { text: 'OK', style: 'cancel' },
          ],
        );
      }
    } finally {
      setManaging(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await deleteAccount();
      if (error) {
        setShowDeleteConfirm(false);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setShowSignOutConfirm(false);
    } finally {
      setSigningOut(false);
    }
  };

  const openLegalLink = async (url) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open link', 'Please try again later.');
    }
  };

  const tierLabel = isFree ? 'Free' : 'Hobbyist';
  const tierColor = isFree ? COLORS.textSecondary : COLORS.primary;
  const tierBg = isFree ? COLORS.surfaceAlt : '#D1FAE5';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.rowLabel}>Email</Text>
              </View>
              <Text style={styles.rowValue} numberOfLines={1}>{user?.email ?? '—'}</Text>
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              <View style={styles.rowLeft}>
                <Ionicons name="star-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.rowLabel}>Plan</Text>
              </View>
              <View style={[styles.tierBadge, { backgroundColor: tierBg }]}>
                <Text style={[styles.tierText, { color: tierColor }]}>{tierLabel}</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={() => router.push('/change-password')}>
              <View style={styles.rowLeft}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.rowLabel}>Change password</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Subscription */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>

          {isFree ? (
            /* Free plan — show usage bars and upgrade CTA */
            <View style={styles.subCard}>
              <View style={styles.subCardHeader}>
                <View>
                  <Text style={styles.subPlanName}>Free Plan</Text>
                  <Text style={styles.subPlanNote}>Limited features</Text>
                </View>
                <View style={[styles.tierBadge, { backgroundColor: tierBg }]}>
                  <Text style={[styles.tierText, { color: tierColor }]}>{tierLabel}</Text>
                </View>
              </View>

              {/* Usage: Recipes */}
              <View style={styles.usageRow}>
                <View style={styles.usageLabelRow}>
                  <Text style={styles.usageLabel}>Recipes</Text>
                  <Text style={styles.usageCount}>{recipeCount} / 5</Text>
                </View>
                <View style={styles.usageBar}>
                  <View style={[
                    styles.usageBarFill,
                    { width: `${Math.min((recipeCount / 5) * 100, 100)}%` },
                    recipeCount >= 5 && { backgroundColor: COLORS.error },
                  ]} />
                </View>
              </View>

              {/* Usage: Ingredients */}
              <View style={styles.usageRow}>
                <View style={styles.usageLabelRow}>
                  <Text style={styles.usageLabel}>Ingredients</Text>
                  <Text style={styles.usageCount}>{ingredientCount} / 20</Text>
                </View>
                <View style={styles.usageBar}>
                  <View style={[
                    styles.usageBarFill,
                    { width: `${Math.min((ingredientCount / 20) * 100, 100)}%` },
                    ingredientCount >= 20 && { backgroundColor: COLORS.error },
                  ]} />
                </View>
              </View>

              <TouchableOpacity style={styles.upgradeBtn} onPress={() => setShowPaywall(true)} activeOpacity={0.85}>
                <Ionicons name="rocket-outline" size={18} color={COLORS.surface} style={{ marginRight: SPACING.sm }} />
                <Text style={styles.upgradeBtnText}>Upgrade to Hobbyist — $4.99/mo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Hobbyist plan — show active features */
            <View style={styles.subCard}>
              <View style={styles.subCardHeader}>
                <View>
                  <Text style={styles.subPlanName}>Hobbyist Plan</Text>
                  <Text style={styles.subPlanNote}>All features unlocked</Text>
                </View>
                <View style={[styles.tierBadge, { backgroundColor: tierBg }]}>
                  <Text style={[styles.tierText, { color: tierColor }]}>Active</Text>
                </View>
              </View>

              {[
                'Unlimited recipes & ingredients',
                'Ingredient price history',
                'Cloud sync across devices',
              ].map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} style={{ marginRight: SPACING.sm }} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={styles.manageRow}
                onPress={handleManageSubscription}
                disabled={managing || restoring}
                activeOpacity={0.7}
              >
                <Text style={styles.manageText}>Manage subscription</Text>
                {managing ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.restoreRow}
                onPress={handleRestorePurchases}
                disabled={managing || restoring}
                activeOpacity={0.7}
              >
                <Text style={styles.manageText}>Restore purchases</Text>
                {restoring ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Ionicons name="refresh-outline" size={16} color={COLORS.textTertiary} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => setShowCurrencyModal(true)}>
              <View style={styles.rowLeft}>
                <Ionicons name="cash-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.rowLabel}>Currency</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{settings.currency} ({settings.currency_symbol})</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => setShowUnitSystemModal(true)}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="scale-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.rowLabel}>Unit system</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{unitSystemLabel}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              onPress={() => { setFoodCostInput(String(settings.default_food_cost_percent)); setFoodCostError(''); setShowFoodCostModal(true); }}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="pie-chart-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.rowLabel}>Default Food Cost %</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{settings.default_food_cost_percent}%</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT ACTIONS</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => setShowSignOutConfirm(true)}>
              <View style={styles.rowLeft}>
                <Ionicons name="log-out-outline" size={18} color={COLORS.text} />
                <Text style={styles.rowLabel}>Sign Out</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={() => setShowDeleteConfirm(true)}>
              <View style={styles.rowLeft}>
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                <Text style={[styles.rowLabel, { color: COLORS.error }]}>Delete Account</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.error} />
            </TouchableOpacity>
          </View>
          <Text style={styles.dangerNote}>Deleting your account permanently removes all your recipes, ingredients and data.</Text>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LEGAL</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => openLegalLink(PRIVACY_POLICY_URL)}>
              <View style={styles.rowLeft}>
                <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.rowLabel}>Privacy Policy</Text>
              </View>
              <Ionicons name="open-outline" size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.row, styles.rowBorder]} onPress={() => openLegalLink(TERMS_URL)}>
              <View style={styles.rowLeft}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.rowLabel}>Terms of Service</Text>
              </View>
              <Ionicons name="open-outline" size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Currency picker */}
      <Modal visible={showCurrencyModal} onClose={() => setShowCurrencyModal(false)} title="Select Currency">
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c.code}
              style={[styles.currencyRow, settings.currency === c.code && styles.currencySelected]}
              onPress={() => handleSelectCurrency(c)}
            >
              <Text style={styles.currencySymbol}>{c.symbol}</Text>
              <Text style={styles.currencyLabel}>{c.label}</Text>
              {settings.currency === c.code && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
            </TouchableOpacity>
          ))}
      </Modal>

      <Modal visible={showUnitSystemModal} onClose={() => setShowUnitSystemModal(false)} title="Select unit system">
        {UNIT_SYSTEMS.map((system) => (
          <TouchableOpacity
            key={system.value}
            style={[styles.currencyRow, settings.unit_system === system.value && styles.currencySelected]}
            onPress={() => handleSelectUnitSystem(system)}
          >
            <Text style={styles.currencyLabel}>{system.label}</Text>
            {settings.unit_system === system.value && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
          </TouchableOpacity>
        ))}
      </Modal>

      <ConfirmModal
        visible={showCurrencyWarning}
        onClose={handleCancelCurrencyWarning}
        onConfirm={() => pendingCurrency && applyCurrency(pendingCurrency)}
        title="Change Currency?"
        message={"Changing currency won't convert your existing recipe prices.\nYou'll need to update them manually."}
        confirmLabel="Change Currency"
        cancelLabel="Cancel"
        variant="danger"
      />

      {/* Food cost % editor */}
      <Modal visible={showFoodCostModal} onClose={() => setShowFoodCostModal(false)} title="Default Food Cost %">
        <Input
          label="Target food cost percentage"
          value={foodCostInput}
          onChangeText={(v) => { setFoodCostInput(v); setFoodCostError(''); }}
          keyboardType="numeric"
          hint="Typical range: 25–35%"
          error={foodCostError}
        />
        <Button title="Save" onPress={handleSaveFoodCost} loading={saving} size="lg" />
      </Modal>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} reason="upgrade" />

      {/* Sign out confirm */}
      <ConfirmModal
        visible={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={handleSignOut}
        title="Sign Out"
        message="You'll need to sign in again to access your recipes and ingredients."
        confirmLabel="Sign Out"
        cancelLabel="Stay Signed In"
        variant="danger"
        loading={signingOut}
      />

      {/* Delete account confirm */}
      <ConfirmModal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message={`This will permanently delete all your recipes, ingredients, and account data.\n\nThis cannot be undone.`}
        confirmLabel="Yes, Delete Everything"
        cancelLabel="Keep My Account"
        variant="danger"
        loading={deleting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.lg },
  section: { marginBottom: SPACING.lg },
  sectionLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textTertiary, letterSpacing: 0.8, marginBottom: SPACING.sm },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, minHeight: 52 },
  rowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rowLabel: { fontSize: FONT_SIZE.base, color: COLORS.text },
  rowValue: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary, maxWidth: 180 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  tierBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  tierText: { fontSize: FONT_SIZE.sm, fontWeight: '700' },
  dangerNote: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: SPACING.sm, paddingHorizontal: SPACING.xs, lineHeight: 18 },
  currencyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.md },
  currencySelected: { backgroundColor: '#F0FDF4' },
  currencySymbol: { width: 28, fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
  currencyLabel: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.text },

  // Subscription section
  subCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  subCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  subPlanName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  subPlanNote: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },

  // Usage bars
  usageRow: { marginBottom: SPACING.sm },
  usageLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  usageLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  usageCount: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  usageBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },

  // Upgrade button
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm + 2,
    marginTop: SPACING.md,
  },
  upgradeBtnText: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.surface },

  // Hobbyist active features
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  featureText: { fontSize: FONT_SIZE.sm, color: COLORS.text },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    minHeight: 44,
  },
  restoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
    minHeight: 44,
  },
  manageText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
});
