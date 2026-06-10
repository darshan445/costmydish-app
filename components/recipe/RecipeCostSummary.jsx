import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '../ui/Badge';
import { COLORS, FONT_SIZE, SPACING, RADIUS } from '../../constants/theme';
import { formatCurrency, formatPercent } from '../../utils/format';

const MARGIN_LABELS = { good: 'On Target', warning: 'Slightly Over', danger: 'Over Budget' };

export function RecipeCostSummary({
  totalCost,
  recommendedPrice = null,
  actualFoodCostPercent = null,
  foodCostPercents = null,
  marginStatus = null,
  currencySymbol = '$',
  sellingFormatLabel = null,
  formatProfits = null,
  allFormatsOnTarget = null,
}) {
  let displayProfit = null;
  let displayIsRange = false;
  let rangeMin = null;
  let rangeMax = null;

  if (formatProfits && formatProfits.length > 0) {
    const min = Math.min(...formatProfits);
    const max = Math.max(...formatProfits);
    if (formatProfits.length === 1 || Math.abs(max - min) < 0.01) {
      displayProfit = min;
    } else {
      displayIsRange = true;
      rangeMin = min;
      rangeMax = max;
    }
  }

  const resolvedFoodCostPercents = (foodCostPercents ?? [])
    .filter((v) => v != null && !Number.isNaN(v));
  const fcps = resolvedFoodCostPercents.length > 0
    ? resolvedFoodCostPercents
    : (actualFoodCostPercent != null ? [actualFoodCostPercent] : []);

  let displayFcp = null;
  let fcpIsRange = false;
  let fcpMin = null;
  let fcpMax = null;

  if (fcps.length > 0) {
    fcpMin = Math.min(...fcps);
    fcpMax = Math.max(...fcps);
    if (fcps.length === 1 || Math.abs(fcpMax - fcpMin) < 0.05) {
      displayFcp = fcpMin;
    } else {
      fcpIsRange = true;
    }
  }

  const showBanner = displayIsRange || displayProfit != null;
  const bannerHighValue = displayIsRange ? rangeMax : displayProfit;
  const bannerIsGreen = allFormatsOnTarget === true;
  const bannerIsRed = (bannerHighValue ?? 0) < 0;
  const bannerBorderColor = bannerIsRed ? COLORS.error : bannerIsGreen ? COLORS.success : COLORS.border;
  const bannerValueColor = bannerIsRed ? COLORS.error : bannerIsGreen ? COLORS.success : COLORS.textSecondary;

  return (
    <View style={styles.container}>
      <View style={styles.bigMetric}>
        <Text style={styles.bigLabel}>Total Recipe Cost</Text>
        <Text style={styles.bigValue}>{formatCurrency(totalCost, currencySymbol)}</Text>
      </View>

      {recommendedPrice != null && actualFoodCostPercent == null && (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Recommended Price</Text>
          <Text style={[styles.rowValue, styles.recommended]}>{formatCurrency(recommendedPrice, currencySymbol)}</Text>
        </View>
      )}

      {showBanner && (
        <View style={[
          styles.profitBanner,
          { borderColor: bannerBorderColor },
          displayIsRange && styles.profitBannerStacked,
        ]}>
          <Text style={styles.profitBannerLabel}>
            {displayIsRange ? 'Profit range' : 'Profit'}
          </Text>
          <Text style={[
            styles.profitBannerValue,
            { color: bannerValueColor },
            displayIsRange && styles.profitBannerValueStacked,
          ]}>
            {displayIsRange
              ? `${formatCurrency(rangeMin, currencySymbol)} – ${formatCurrency(rangeMax, currencySymbol)}`
              : formatCurrency(displayProfit, currencySymbol)}
          </Text>
        </View>
      )}

      {(displayFcp != null || fcpIsRange) && (
        <>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Food Cost %</Text>
              {!fcpIsRange && sellingFormatLabel != null && (
                <Text style={styles.rowSubLabel}>based on {sellingFormatLabel}</Text>
              )}
              {fcpIsRange && (
                <Text style={styles.rowSubLabel}>across selling formats</Text>
              )}
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>
                {fcpIsRange
                  ? `${formatPercent(fcpMin)} – ${formatPercent(fcpMax)}`
                  : formatPercent(displayFcp)}
              </Text>
              {marginStatus && (
                <Badge label={MARGIN_LABELS[marginStatus]} variant={marginStatus} style={styles.badge} />
              )}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bigMetric: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  bigLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  bigValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  rowLabel: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
  },
  rowSubLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rowValue: {
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  recommended: {
    color: COLORS.primary,
  },
  profitBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  profitBannerStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  profitBannerLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  profitBannerValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'right',
  },
  profitBannerValueStacked: {
    fontSize: FONT_SIZE.lg,
    textAlign: 'left',
  },
  badge: {
    marginLeft: SPACING.xs,
  },
});
