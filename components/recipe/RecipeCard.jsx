import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';
import { FOOD_COST_COPY as C } from '../../constants/copy';
import { formatCurrency, formatFoodCostPercent, formatPercent, formatCategory } from '../../utils/format';

const MARGIN_LABELS = { good: 'On Target', warning: 'Slightly Over', danger: 'Over Budget' };

function getFoodCostDisplay(costSummary) {
  const fcps = costSummary?.food_cost_percents?.filter((v) => v != null && !Number.isNaN(v)) ?? [];
  const resolved = fcps.length > 0
    ? fcps
    : (costSummary?.actual_food_cost_percent != null ? [costSummary.actual_food_cost_percent] : []);

  if (resolved.length === 0) return null;

  const min = Math.min(...resolved);
  const max = Math.max(...resolved);
  const isRange = resolved.length > 1 && Math.abs(max - min) >= 0.01;

  return {
    text: isRange
      ? `${formatFoodCostPercent(min)} – ${formatFoodCostPercent(max)}`
      : formatFoodCostPercent(min),
    isRange,
  };
}

function getProfitDisplay(costSummary, currencySymbol) {
  const profits = costSummary?.format_profits?.length > 0
    ? costSummary.format_profits
    : costSummary?.gross_profit != null
      ? [costSummary.gross_profit]
      : [];

  if (profits.length === 0) return null;

  const min = Math.min(...profits);
  const max = Math.max(...profits);
  const isRange = profits.length > 1 && Math.abs(max - min) >= 0.01;
  const status = costSummary?.worst_margin_status;

  let color = COLORS.text;
  if (max < 0 || status === 'danger') {
    color = COLORS.error;
  } else if (costSummary?.all_formats_on_target || status === 'good') {
    color = COLORS.success;
  } else if (status === 'warning') {
    color = COLORS.warning;
  }

  return {
    text: isRange
      ? `${formatCurrency(min, currencySymbol)} – ${formatCurrency(max, currencySymbol)}`
      : formatCurrency(min, currencySymbol),
    isRange,
    color,
    status,
  };
}

function getStatusBadge(costSummary) {
  const status = costSummary?.worst_margin_status;
  if (!status || costSummary?.format_count < 1) return null;
  return { label: MARGIN_LABELS[status], variant: status };
}

export const RecipeCard = memo(function RecipeCard({ recipe, costSummary, currencySymbol, onPress, onDelete }) {
  const foodCostDisplay = getFoodCostDisplay(costSummary);
  const profitDisplay = getProfitDisplay(costSummary, currencySymbol);
  const statusBadge = getStatusBadge(costSummary);

  const profitRowStyle = profitDisplay?.status === 'danger'
    ? styles.profitRowBad
    : profitDisplay?.status === 'warning'
      ? styles.profitRowWarn
      : costSummary?.all_formats_on_target
        ? styles.profitRowGood
        : null;

  return (
    <Card padding="none" style={styles.card}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.body}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>{recipe.name}</Text>
            {recipe.is_sample && <Badge label="Sample" variant="info" style={styles.sampleBadge} />}
          </View>
          {recipe.category ? (
            <Text style={styles.category}>{formatCategory(recipe.category)}</Text>
          ) : null}
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricHalf}>
            <Text style={styles.metricLabel}>{C.result.dishCost}</Text>
            <Text style={styles.metricValue}>{formatCurrency(costSummary?.total_recipe_cost, currencySymbol)}</Text>
          </View>
          {foodCostDisplay != null && (
            <>
              <View style={styles.metricDivider} />
              <View style={[styles.metricHalf, foodCostDisplay.isRange && styles.metricHalfStacked]}>
                <Text style={styles.metricLabel}>
                  {foodCostDisplay.isRange ? 'Food cost range' : 'Food cost'}
                </Text>
                <Text style={[
                  styles.metricValue,
                  foodCostDisplay.isRange && styles.metricValueRange,
                  costSummary?.worst_margin_status === 'danger' && styles.metricValueDanger,
                  costSummary?.worst_margin_status === 'warning' && styles.metricValueWarning,
                  costSummary?.worst_margin_status === 'good' && styles.metricValueGood,
                ]}>
                  {foodCostDisplay.text}
                </Text>
              </View>
            </>
          )}
        </View>

        {profitDisplay != null && (
          <View style={[
            styles.profitRow,
            profitDisplay.isRange && styles.profitRowRange,
            profitRowStyle,
          ]}>
            <Text style={styles.profitLabel}>
              {profitDisplay.isRange ? 'Dish profit range' : 'Dish profit'}
            </Text>
            <Text style={[
              styles.profitValue,
              { color: profitDisplay.color },
              profitDisplay.isRange && styles.profitValueRange,
            ]}>
              {profitDisplay.text}
            </Text>
          </View>
        )}

        {costSummary?.total_recipe_cost > 0 && (
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              {statusBadge ? (
                <Badge label={statusBadge.label} variant={statusBadge.variant} />
              ) : (
                <Badge
                  label={`${formatPercent(costSummary.target_food_cost_percent ?? recipe.target_food_cost_percent)} target`}
                  variant="neutral"
                />
              )}
              {costSummary.format_count > 1 && (
                <Text style={styles.formatCount}>
                  {costSummary.format_count} formats
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
          </View>
        )}
      </TouchableOpacity>

      {onDelete && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      )}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.sm, flexDirection: 'row', alignItems: 'stretch', padding: 0, overflow: 'hidden' },
  body: { flex: 1, padding: SPACING.md },
  header: { marginBottom: SPACING.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 2 },
  name: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  sampleBadge: { marginLeft: SPACING.xs },
  category: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  metricHalf: { flex: 1, alignItems: 'center', paddingHorizontal: SPACING.xs },
  metricHalfStacked: { paddingHorizontal: SPACING.sm },
  metricLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 2, textAlign: 'center' },
  metricValue: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  metricValueRange: { fontSize: FONT_SIZE.sm, lineHeight: 18 },
  metricValueGood: { color: COLORS.success },
  metricValueWarning: { color: COLORS.warning },
  metricValueDanger: { color: COLORS.error },
  metricDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  profitRowRange: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: SPACING.xs,
  },
  profitRowGood: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  profitRowBad: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  profitRowWarn: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  profitLabel: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.textSecondary },
  profitValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
    color: COLORS.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  profitValueRange: {
    fontSize: FONT_SIZE.base,
    textAlign: 'left',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    flexWrap: 'wrap',
  },
  formatCount: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  deleteBtn: {
    paddingHorizontal: SPACING.md,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    backgroundColor: '#FFF5F5',
  },
});
