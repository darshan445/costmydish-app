import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { Skeleton, RecipeCardSkeleton } from '../../components/ui/Skeleton';
import { PaywallModal } from '../../components/paywall/PaywallModal';
import { Button } from '../../components/ui/Button';
import { DishStartInput } from '../../components/home/DishStartInput';
import { useRecipes } from '../../hooks/useRecipes';
import { useCalculateFoodCost } from '../../hooks/useCalculateFoodCost';
import useAuthStore from '../../stores/authStore';
import useRecipeStore from '../../stores/recipeStore';
import useSettingsStore from '../../stores/settingsStore';
import { formatFoodCostPercent } from '../../utils/format';
import { normalizeFoodCostPercent } from '../../lib/calculations';
import { trackFoodCost } from '../../lib/foodCostAnalytics';
import { DISH_STARTERS } from '../../constants/dishStarters';
import { getUniqueSellingUnitOptions } from '../../constants/units';
import { FOOD_COST_COPY as C } from '../../constants/copy';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { recipes, costSummaries, error, refetch } = useRecipes();
  // Decide on "loaded at least once", not `loading`: before the first fetch starts
  // `loading` is false with no dishes, which briefly showed the empty screen.
  const hydrated = useRecipeStore((s) => s.hydrated);
  const { startCalculate, showPaywall, closePaywall } = useCalculateFoodCost();
  const symbol = useSettingsStore((s) => s.settings.currency_symbol) ?? '$';
  const sellingUnits = useRecipeStore((s) => s.sellingUnits);
  const unitOptions = useMemo(() => {
    const opts = getUniqueSellingUnitOptions(sellingUnits);
    if (opts.length > 0) return opts;
    return [
      { value: 'piece', label: 'Piece' },
      { value: 'serving', label: 'Serving' },
      { value: 'plate', label: 'Plate' },
      { value: 'slice', label: 'Slice' },
      { value: 'cup', label: 'Cup' },
    ];
  }, [sellingUnits]);

  const handleStart = ({ method, chip, ...prefill }) => {
    trackFoodCost('home_start', { method, chip: chip ?? null });
    startCalculate({ source: 'home_start', prefill });
  };

  const greeting = profile?.full_name ? `Hi, ${profile.full_name.split(' ')[0]} 👋` : 'Welcome 👋';
  const recentRecipes = recipes.slice(0, 5);

  const overTargetRecipes = recipes.filter((r) => {
    const s = costSummaries[r.id];
    return s?.marginStatus === 'danger' || s?.has_danger_format === true;
  });
  const overTargetCount = overTargetRecipes.length;

  if (!hydrated && error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{C.home.loadError}</Text>
          <Button title={C.home.retry} onPress={refetch} size="lg" variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Skeleton height={24} width={180} style={{ marginBottom: 8 }} />
            <Skeleton height={14} width={240} />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Skeleton height={30} width={40} style={{ marginBottom: 6 }} />
              <Skeleton height={12} width={88} />
            </View>
            <View style={styles.statCard}>
              <Skeleton height={30} width={40} style={{ marginBottom: 6 }} />
              <Skeleton height={12} width={72} />
            </View>
          </View>
          <Skeleton height={17} width={130} style={{ marginBottom: SPACING.sm, marginTop: SPACING.xs }} />
          {[1, 2, 3, 4].map((n) => <RecipeCardSkeleton key={n} />)}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (recipes.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.startScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.startTitle}>{C.home.startTitle}</Text>
          <Text style={styles.startSub}>{C.home.startSub}</Text>
          <DishStartInput starters={DISH_STARTERS} unitOptions={unitOptions} onStart={handleStart} />
          <TouchableOpacity
            style={styles.sampleLink}
            onPress={() => {
              trackFoodCost('sample_result_opened', {});
              router.push('/recipe/sample');
            }}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <View style={styles.sampleLinkIcon}>
              <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.sampleLinkCopy}>
              <Text style={styles.sampleLinkTitle}>{C.home.sampleTitle}</Text>
              <Text style={styles.sampleLinkSub}>{C.home.sampleSub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </ScrollView>
        <PaywallModal visible={showPaywall} onClose={closePaywall} reason="recipe" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={recentRecipes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.subtitle}>{C.home.greetingSubtitle}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{recipes.length}</Text>
                <Text style={styles.statLabel}>{C.home.totalDishes}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, overTargetCount > 0 && styles.statValueDanger]}>
                  {overTargetCount}
                </Text>
                <Text style={styles.statLabel}>Over target</Text>
                {overTargetCount === 0 && (
                  <Text style={styles.allGoodLabel}>All good ✓</Text>
                )}
              </View>
            </View>

            {overTargetCount > 0 && (
              <View style={styles.attentionSection}>
                <Text style={styles.attentionTitle}>Needs attention</Text>
                {overTargetRecipes.map((r) => {
                  const summary = costSummaries[r.id];
                  const displayFcp = summary?.worst_food_cost_percent ?? summary?.actual_food_cost_percent;
                  const diff = (normalizeFoodCostPercent(displayFcp) ?? 0)
                    - (normalizeFoodCostPercent(r.target_food_cost_percent) ?? 0);
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={styles.attentionCard}
                      onPress={() => router.push(`/recipe/${r.id}`)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.attentionLeft}>
                        <Text style={styles.attentionName} numberOfLines={1}>{r.name}</Text>
                        <Text style={styles.attentionSub}>
                          {summary?.format_count > 1 && summary?.worst_format_price != null
                            ? `Target ${r.target_food_cost_percent}% · ${symbol}${summary.worst_format_price} format`
                            : `Target ${r.target_food_cost_percent}%`
                          }
                        </Text>
                      </View>
                      <View style={styles.attentionRight}>
                        <View style={styles.dangerBadge}>
                          <Text style={styles.dangerBadgeText}>
                            {formatFoodCostPercent(displayFcp)} food cost
                          </Text>
                        </View>
                        {diff > 0 && (
                          <Text style={styles.attentionDiff}>
                            +{formatFoodCostPercent(diff).replace('%', '')}% over
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.error} style={styles.attentionChevron} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={styles.sectionTitle}>{C.home.recentTitle}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            costSummary={costSummaries[item.id] ?? null}
            currencySymbol={symbol}
            onPress={() => router.push(`/recipe/${item.id}`)}
          />
        )}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.createCta}
            onPress={() => startCalculate({ source: 'home' })}
            activeOpacity={0.7}
          >
            <Ionicons
              name="calculator-outline"
              size={18}
              color={COLORS.primary}
              style={{ marginRight: SPACING.xs }}
            />
            <Text style={styles.createCtaText}>{C.action.calculateAnother}</Text>
          </TouchableOpacity>
        }
      />
      <PaywallModal visible={showPaywall} onClose={closePaywall} reason="recipe" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.md, flexGrow: 1 },
  header: { marginBottom: SPACING.lg },
  greeting: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.primary },
  statValueDanger: { color: COLORS.error },
  statLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },

  attentionSection: { marginBottom: SPACING.md },
  attentionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },
  attentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  attentionLeft: { flex: 1, marginRight: SPACING.sm },
  attentionName: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.text },
  attentionSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  attentionRight: { alignItems: 'flex-end', gap: 2 },
  dangerBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  dangerBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.error },
  attentionDiff: { fontSize: FONT_SIZE.xs, color: COLORS.error },
  attentionChevron: { marginLeft: SPACING.xs },

  allGoodLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.success, marginTop: 2 },

  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },

  createCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(45, 106, 79, 0.06)',
    minHeight: 48,
  },
  createCtaText: { fontSize: FONT_SIZE.base, color: COLORS.primary, fontWeight: '700' },

  startScroll: { padding: SPACING.md, paddingTop: SPACING.xl, paddingBottom: SPACING.xxl },
  startTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 36,
    marginBottom: SPACING.sm,
  },
  startSub: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  sampleLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    minHeight: 64,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  sampleLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleLinkCopy: { flex: 1 },
  sampleLinkTitle: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.text },
  sampleLinkSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },

  errorWrap: { flex: 1, justifyContent: 'center', padding: SPACING.lg, gap: SPACING.md },
  errorText: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary, textAlign: 'center' },
});
