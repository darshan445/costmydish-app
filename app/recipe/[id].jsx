import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RecipeCostSummary } from '../../components/recipe/RecipeCostSummary';
import { IngredientRow } from '../../components/recipe/IngredientRow';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useRecipeCost } from '../../hooks/useRecipeCost';
import { calculateSellingFormatMetrics } from '../../lib/calculations';
import { useSubscription } from '../../hooks/useSubscription';
import useRecipeStore from '../../stores/recipeStore';
import useSettingsStore from '../../stores/settingsStore';
import { COLORS, FONT_SIZE, SPACING, RADIUS } from '../../constants/theme';
import { formatCategory, formatCurrency, formatPercent } from '../../utils/format';
import { Skeleton } from '../../components/ui/Skeleton';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { fetchRecipeWithIngredients, deleteRecipe, getRecipeById } = useRecipeStore();
  const getCurrencySymbol = useSettingsStore((s) => s.getCurrencySymbol);
  const symbol = getCurrencySymbol();
  const { canExportPDF } = useSubscription();

  // Seed immediately from the cached store list so the screen is never blank
  const cachedRecipe = getRecipeById(id);
  const [recipe, setRecipe] = useState(cachedRecipe ?? null);
  const [ingredientsLoading, setIngredientsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    setIngredientsLoading(true);
    const { data, error: err } = await fetchRecipeWithIngredients(id);
    if (err) setError(err);
    else setRecipe(data);
    setIngredientsLoading(false);
  };

  const { totalCost, ingredientCosts } = useRecipeCost({
    recipeIngredients: recipe?.recipe_ingredients ?? [],
  });

  const formatMetrics = (recipe?.selling_formats ?? [])
    .filter((f) => parseFloat(f.selling_price) > 0)
    .map((f) => {
      const price = parseFloat(f.selling_price);
      const metrics = calculateSellingFormatMetrics({
        totalRecipeCost: totalCost,
        unitQuantity: f.unit_quantity,
        sellingPrice: f.selling_price,
        targetFoodCostPercent: recipe?.target_food_cost_percent,
      });
      return {
        ...f,
        price,
        costPerUnit: metrics.costPerUnit,
        fcp: metrics.foodCostPercent,
        profitPerFormat: metrics.profit,
        marginStatus: metrics.marginStatus,
        recommendedBundlePrice: metrics.recommendedBundlePrice,
      };
    });

  const defaultFormatMetrics = formatMetrics.find((f) => f.is_default) ?? formatMetrics[0] ?? null;
  const worstFormatMetrics = formatMetrics.reduce(
    (worst, fm) => ((fm.fcp ?? 0) > (worst?.fcp ?? -Infinity) ? fm : worst),
    null,
  );
  const foodCostPercents = formatMetrics.map((fm) => fm.fcp).filter((v) => v != null);

  const handleDelete = async () => {
    await deleteRecipe(id);
    router.back();
  };

  if (error && !recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  // No cached data AND no fetch result yet (e.g. deep link, cold open)
  if (!recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xxl }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push(`/recipe/edit/${id}`)} style={styles.headerBtn}>
            <Ionicons name="create-outline" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowDeleteConfirm(true)} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={22} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleSection}>
          <Text style={styles.name}>{recipe.name}</Text>
          <View style={styles.metaRow}>
            {recipe.category && <Badge label={formatCategory(recipe.category)} variant="neutral" />}
            {recipe.is_sample && <Badge label="Sample" variant="info" style={{ marginLeft: SPACING.xs }} />}
          </View>
          <Text style={styles.batchInfo}>Target: {recipe.target_food_cost_percent}% food cost</Text>
        </View>

        <Text style={styles.sectionTitle}>Cost Summary</Text>

        {ingredientsLoading ? (
          <View style={styles.costSkeletonCard}>
            {[1, 2, 3].map((n) => (
              <View key={n} style={styles.costSkeletonRow}>
                <Skeleton height={13} width={110} />
                <Skeleton height={17} width={80} />
              </View>
            ))}
            <View style={[styles.costSkeletonRow, { marginTop: SPACING.xs, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border }]}>
              <Skeleton height={13} width={140} />
              <Skeleton height={22} width={100} style={{ borderRadius: RADIUS.md }} />
            </View>
          </View>
        ) : (
          /* Base metrics: total cost, cost per unit, recommended price, batch profit range */
          <RecipeCostSummary
            totalCost={totalCost}
            recommendedPrice={defaultFormatMetrics?.recommendedBundlePrice ?? (
              totalCost > 0 && recipe.target_food_cost_percent > 0
                ? totalCost / (recipe.target_food_cost_percent / 100)
                : null
            )}
            foodCostPercents={foodCostPercents}
            marginStatus={worstFormatMetrics?.marginStatus ?? defaultFormatMetrics?.marginStatus ?? null}
            currencySymbol={symbol}
            formatProfits={formatMetrics.length > 0 ? formatMetrics.map((fm) => fm.profitPerFormat) : null}
            allFormatsOnTarget={
              formatMetrics.length > 0 &&
              formatMetrics.every((fm) => fm.marginStatus === 'good' && fm.profitPerFormat >= 0)
            }
          />
        )}

        {/* Per-format selling analysis */}
        {!ingredientsLoading && formatMetrics.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Selling Analysis</Text>
            {formatMetrics.map((fm) => {
              const MARGIN_LABELS = { good: 'On Target', warning: 'Slightly Over', danger: 'Over Budget' };
              const profitColor = fm.profitPerFormat < 0
                ? COLORS.error
                : fm.marginStatus === 'danger'
                  ? COLORS.textSecondary
                  : COLORS.success;
              return (
                <View key={fm.id} style={styles.formatCard}>
                  {/* Header row: format name + selling price */}
                  <View style={styles.formatCardHeader}>
                    <Text style={styles.formatCardName}>{fm.name}</Text>
                    <Text style={styles.formatCardPrice}>{symbol}{fm.price.toFixed(2)}</Text>
                  </View>

                  <View style={styles.formatMetricsRow}>
                    <View style={styles.formatMetric}>
                      <Text style={styles.formatMetricLabel}>Cost / unit</Text>
                      <Text style={styles.formatMetricValue}>{formatCurrency(fm.costPerUnit, symbol)}</Text>
                    </View>
                    <View style={styles.formatMetricDivider} />
                    <View style={styles.formatMetric}>
                      <Text style={styles.formatMetricLabel}>Profit</Text>
                      <Text style={[styles.formatMetricValue, { color: profitColor }]}>
                        {formatCurrency(fm.profitPerFormat, symbol)}
                      </Text>
                    </View>
                    <View style={styles.formatMetricDivider} />
                    <View style={styles.formatMetric}>
                      <Text style={styles.formatMetricLabel}>Food cost</Text>
                      <Text style={[styles.formatMetricValue, {
                        color: fm.marginStatus === 'good' ? COLORS.success
                          : fm.marginStatus === 'warning' ? COLORS.warning
                          : COLORS.error,
                      }]}>
                        {formatPercent(fm.fcp)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.formatCardFooter}>
                    {fm.marginStatus && (
                      <Badge label={MARGIN_LABELS[fm.marginStatus]} variant={fm.marginStatus} />
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {!ingredientsLoading && formatMetrics.length === 0 && (
          <View style={styles.noFormatsHint}>
            <Text style={styles.noFormatsText}>No selling prices set yet. Edit the recipe to add formats.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Ingredients</Text>
        {ingredientsLoading ? (
          <>
            {[1, 2, 3].map((n) => (
              <View key={n} style={styles.skeletonRow}>
                <View style={styles.skeletonLeft}>
                  <View style={[styles.skeletonLine, { width: '60%', marginBottom: 6 }]} />
                  <View style={[styles.skeletonLine, { width: '35%', height: 10 }]} />
                </View>
                <View style={[styles.skeletonLine, { width: 52, height: 18, borderRadius: RADIUS.sm }]} />
              </View>
            ))}
          </>
        ) : (
          recipe.recipe_ingredients?.map((ri) => {
            const costItem = ingredientCosts.find((c) => c.ingredientId === ri.ingredient_id);
            return (
              <IngredientRow
                key={ri.id}
                item={ri}
                cost={costItem?.cost ?? 0}
                error={costItem?.error}
                currencySymbol={symbol}
              />
            );
          })
        )}

        {canExportPDF && (
          <Button
            title="Export PDF"
            variant="secondary"
            onPress={() => {}}
            style={styles.exportBtn}
          />
        )}
      </ScrollView>

      <ConfirmModal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Recipe"
        message="This will permanently remove this recipe and all its cost data. This cannot be undone."
        confirmLabel="Delete Recipe"
        cancelLabel="Keep Recipe"
        variant="danger"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  headerActions: { flexDirection: 'row', gap: SPACING.sm },
  headerBtn: { padding: 4 },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  titleSection: { marginBottom: SPACING.lg },
  name: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  batchInfo: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  errorText: { textAlign: 'center', color: COLORS.error, padding: SPACING.xl },
  exportBtn: { marginTop: SPACING.xl },

  // Per-format selling analysis cards
  formatCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  formatCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  formatCardName: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.text },
  formatCardPrice: { fontSize: FONT_SIZE.md, fontWeight: '800', color: COLORS.primary },
  formatMetricsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  formatMetric: { flex: 1, alignItems: 'center' },
  formatMetricLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 2 },
  formatMetricValue: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  formatMetricDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: SPACING.xs },
  formatCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  formatBatchLine: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  noFormatsHint: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  noFormatsText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center' },

  // Cost summary skeleton
  costSkeletonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  costSkeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Ingredient skeleton loader
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 56,
  },
  skeletonLeft: { flex: 1, marginRight: SPACING.sm },
  skeletonLine: {
    height: 13,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
    opacity: 0.6,
  },
});
