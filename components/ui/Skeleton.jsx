import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

/** Base animated skeleton block. Pulses between full and 30% opacity. */
export function Skeleton({ width, height = 14, style }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.base,
        { height, opacity },
        width != null ? { width } : { flex: 1 },
        style,
      ]}
    />
  );
}

/**
 * Mimics a RecipeCard: title line, category line, 3-col metrics, footer badge.
 */
export function RecipeCardSkeleton() {
  return (
    <View style={skStyles.card}>
      <View style={skStyles.body}>
        {/* Header */}
        <View style={skStyles.headerRow}>
          <Skeleton height={17} style={{ maxWidth: '65%', marginBottom: 6 }} />
          <Skeleton height={12} width={72} />
        </View>

        {/* Metrics row */}
        <View style={skStyles.metricsRow}>
          <View style={skStyles.metric}>
            <Skeleton height={10} width={52} style={{ marginBottom: 6 }} />
            <Skeleton height={13} width={60} />
          </View>
          <View style={skStyles.metricDivider} />
          <View style={skStyles.metric}>
            <Skeleton height={10} width={44} style={{ marginBottom: 6 }} />
            <Skeleton height={13} width={52} />
          </View>
          <View style={skStyles.metricDivider} />
          <View style={skStyles.metric}>
            <Skeleton height={10} width={36} style={{ marginBottom: 6 }} />
            <Skeleton height={13} width={48} />
          </View>
        </View>

        {/* Footer */}
        <View style={skStyles.footer}>
          <Skeleton height={22} width={110} style={{ borderRadius: RADIUS.full }} />
          <Skeleton height={13} width={68} />
        </View>
      </View>
    </View>
  );
}

/**
 * Mimics an IngredientCard: name, price line, unit badge on the right.
 */
export function IngredientCardSkeleton() {
  return (
    <View style={skStyles.ingCard}>
      <View style={skStyles.ingInfo}>
        <Skeleton height={15} style={{ maxWidth: '55%', marginBottom: 6 }} />
        <Skeleton height={12} style={{ maxWidth: '40%' }} />
      </View>
      <Skeleton height={28} width={40} style={{ borderRadius: RADIUS.md }} />
    </View>
  );
}

const skStyles = StyleSheet.create({
  // Recipe card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  body: { padding: SPACING.md },
  headerRow: { marginBottom: SPACING.md },
  metricsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  metric: { flex: 1, alignItems: 'center' },
  metricDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  // Ingredient card
  ingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  ingInfo: { flex: 1, marginRight: SPACING.sm },
});

const styles = StyleSheet.create({
  base: { backgroundColor: COLORS.border, borderRadius: RADIUS.sm },
});
