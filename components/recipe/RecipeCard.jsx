import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { COLORS, FONT_SIZE, SPACING } from '../../constants/theme';
import { formatCurrency, formatPercent, formatCategory } from '../../utils/format';

const MARGIN_VARIANT = { good: 'good', warning: 'warning', danger: 'danger' };

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

  let color = COLORS.text;
  if (max < 0) {
    color = COLORS.error;
  } else if (costSummary?.all_formats_on_target) {
    color = COLORS.success;
  }

  return {
    text: isRange
      ? `${formatCurrency(min, currencySymbol)} – ${formatCurrency(max, currencySymbol)}`
      : formatCurrency(min, currencySymbol),
    color,
  };
}

export const RecipeCard = memo(function RecipeCard({ recipe, costSummary, currencySymbol, onPress, onDelete }) {
  const marginVariant = MARGIN_VARIANT[costSummary?.marginStatus] ?? 'neutral';
  const profitDisplay = getProfitDisplay(costSummary, currencySymbol);

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

        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Total cost</Text>
            <Text style={styles.metricValue}>{formatCurrency(costSummary?.total_recipe_cost, currencySymbol)}</Text>
          </View>
          {costSummary?.actual_food_cost_percent != null && (
            <>
              <View style={styles.metricDivider} />
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Food cost</Text>
                <Text style={styles.metricValue}>{formatPercent(costSummary.actual_food_cost_percent)}</Text>
              </View>
            </>
          )}
          {profitDisplay != null && (
            <>
              <View style={styles.metricDivider} />
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Profit</Text>
                <Text style={[styles.metricValue, { color: profitDisplay.color }]} numberOfLines={1}>
                  {profitDisplay.text}
                </Text>
              </View>
            </>
          )}
        </View>

        {costSummary?.total_recipe_cost > 0 && (
          <View style={styles.footer}>
            {costSummary.format_count >= 1 ? (
              <Badge
                label={`${costSummary.format_count} selling format${costSummary.format_count === 1 ? '' : 's'}`}
                variant={marginVariant}
              />
            ) : (
              <Badge
                label={`${formatPercent(costSummary.target_food_cost_percent ?? recipe.target_food_cost_percent)} target`}
                variant="neutral"
              />
            )}
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
  header: { marginBottom: SPACING.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 2 },
  name: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  sampleBadge: { marginLeft: SPACING.xs },
  category: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  metrics: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  metric: { flex: 1, alignItems: 'center' },
  metricLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginBottom: 2 },
  metricValue: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  metricDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
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
