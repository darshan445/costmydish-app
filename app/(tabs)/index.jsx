import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton, RecipeCardSkeleton } from '../../components/ui/Skeleton';
import { PaywallModal } from '../../components/paywall/PaywallModal';
import { useRecipes } from '../../hooks/useRecipes';
import { useSubscription } from '../../hooks/useSubscription';
import useAuthStore from '../../stores/authStore';
import useSettingsStore from '../../stores/settingsStore';
import { formatFoodCostPercent } from '../../utils/format';
import { normalizeFoodCostPercent } from '../../lib/calculations';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { recipes, costSummaries, loading } = useRecipes();
  const { canCreateRecipe } = useSubscription();
  const getCurrencySymbol = useSettingsStore((s) => s.getCurrencySymbol);
  const symbol = getCurrencySymbol();

  const [showPaywall, setShowPaywall] = useState(false);

  const handleCreateRecipe = () => {
    if (!canCreateRecipe(recipes.length)) {
      setShowPaywall(true);
      return;
    }
    router.push('/recipe/create');
  };

  const greeting = profile?.full_name ? `Hi, ${profile.full_name.split(' ')[0]} 👋` : 'Welcome 👋';
  const recentRecipes = recipes.slice(0, 5);

  const overTargetRecipes = recipes.filter((r) => {
    const s = costSummaries[r.id];
    return s?.marginStatus === 'danger' || s?.has_danger_format === true;
  });
  const overTargetCount = overTargetRecipes.length;

  const hasRecipes = !loading && recipes.length > 0;
  const showSkeleton = loading && recipes.length === 0;

  // ── Full-screen skeleton for first load ──────────────────────────────────
  if (showSkeleton) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {/* Greeting */}
          <View style={styles.header}>
            <Skeleton height={24} width={180} style={{ marginBottom: 8 }} />
            <Skeleton height={14} width={240} />
          </View>

          {/* Stats row */}
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

          {/* Section title */}
          <Skeleton height={17} width={130} style={{ marginBottom: SPACING.sm, marginTop: SPACING.xs }} />

          {/* Recipe card skeletons */}
          {[1, 2, 3, 4].map((n) => <RecipeCardSkeleton key={n} />)}
        </ScrollView>
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
              <Text style={styles.subtitle}>Here's a quick look at your recent recipes</Text>
            </View>

            {/* Stat cards */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{recipes.length}</Text>
                <Text style={styles.statLabel}>Total Recipes</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, overTargetCount > 0 && styles.statValueDanger]}>
                  {overTargetCount}
                </Text>
                <Text style={styles.statLabel}>Over Target</Text>
                {hasRecipes && overTargetCount === 0 && (
                  <Text style={styles.allGoodLabel}>All good ✓</Text>
                )}
              </View>
            </View>

            {/* Needs Attention — only when over-target recipes exist */}
            {hasRecipes && overTargetCount > 0 && (
              <View style={styles.attentionSection}>
                <Text style={styles.attentionTitle}>NEEDS ATTENTION</Text>
                {overTargetRecipes.map((r) => {
                  const summary = costSummaries[r.id];
                  // For multi-format recipes show worst format's food cost, not default's
                  const displayFcp = summary?.format_count > 1
                    ? summary?.worst_food_cost_percent
                    : summary?.actual_food_cost_percent;
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

            {recentRecipes.length > 0 && (
              <Text style={styles.sectionTitle}>Recent Recipes</Text>
            )}
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
        ListEmptyComponent={
          <EmptyState
            icon="🍽️"
            title="No recipes yet"
            description="Create your first recipe to see a full cost breakdown."
            actionLabel="Create Recipe"
            onAction={handleCreateRecipe}
          />
        }
        ListFooterComponent={
          recentRecipes.length > 0 ? (
            <TouchableOpacity
              style={styles.createCta}
              onPress={handleCreateRecipe}
              activeOpacity={0.7}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={COLORS.primary}
                style={{ marginRight: SPACING.xs }}
              />
              <Text style={styles.createCtaText}>Create new recipe</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} reason="recipe" />
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
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  attentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
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
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
    minHeight: 44,
  },
  createCtaText: { fontSize: FONT_SIZE.base, color: COLORS.primary, fontWeight: '600' },
});
