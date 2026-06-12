import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PaywallModal } from '../../../components/paywall/PaywallModal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { supabase } from '../../../lib/supabase';
import useIngredientStore from '../../../stores/ingredientStore';
import useSettingsStore from '../../../stores/settingsStore';
import { useSubscription } from '../../../hooks/useSubscription';
import { formatUnitLabel } from '../../../constants/units';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../../constants/theme';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function PriceHistoryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { canViewPriceHistory, isFree } = useSubscription();
  const getIngredientById = useIngredientStore((s) => s.getIngredientById);
  const getCurrencySymbol = useSettingsStore((s) => s.getCurrencySymbol);
  const symbol = getCurrencySymbol();

  const ingredient = getIngredientById(id);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ingredient_price_history')
        .select('*')
        .eq('ingredient_id', id)
        .order('changed_at', { ascending: false });
      if (!error) setHistory(data ?? []);
    } catch (_) {}
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!canViewPriceHistory) {
        setLoading(false);
        setShowPaywall(true);
        return;
      }
      loadHistory();
    }, [canViewPriceHistory, loadHistory]),
  );

  const handlePaywallClose = () => {
    setShowPaywall(false);
    router.back();
  };

  const renderItem = ({ item, index }) => {
    const isIncrease = item.new_price > item.old_price;
    const isDecrease = item.new_price < item.old_price;
    const priceDiff = item.new_price - item.old_price;
    const pctChange = item.old_price > 0
      ? ((priceDiff / item.old_price) * 100).toFixed(1)
      : null;
    const isFirst = index === 0;

    return (
      <View style={styles.timelineRow}>
        {/* Left — timeline line + dot */}
        <View style={styles.timelineLeft}>
          <View style={[
            styles.dot,
            isIncrease && styles.dotUp,
            isDecrease && styles.dotDown,
          ]} />
          <View style={styles.line} />
        </View>

        {/* Right — content card */}
        <View style={[styles.historyCard, isFirst && styles.historyCardFirst]}>
          <View style={styles.historyTop}>
            <View style={styles.priceChange}>
              <Text style={styles.oldPrice}>{symbol}{Number(item.old_price).toFixed(2)}</Text>
              <Ionicons
                name={isIncrease ? 'arrow-up' : isDecrease ? 'arrow-down' : 'remove'}
                size={14}
                color={isIncrease ? COLORS.error : isDecrease ? COLORS.success : COLORS.textTertiary}
                style={{ marginHorizontal: 4 }}
              />
              <Text style={[
                styles.newPrice,
                isIncrease && styles.priceUp,
                isDecrease && styles.priceDown,
              ]}>
                {symbol}{Number(item.new_price).toFixed(2)}
              </Text>
            </View>

            {pctChange != null && (
              <View style={[
                styles.changeBadge,
                isIncrease ? styles.changeBadgeUp : isDecrease ? styles.changeBadgeDown : styles.changeBadgeNeutral,
              ]}>
                <Text style={[
                  styles.changeBadgeText,
                  isIncrease ? styles.changeBadgeTextUp : isDecrease ? styles.changeBadgeTextDown : null,
                ]}>
                  {isIncrease ? '+' : ''}{pctChange}%
                </Text>
              </View>
            )}
          </View>

          <View style={styles.historyMeta}>
            <Text style={styles.historyDate}>{formatDate(item.changed_at)}</Text>
            <Text style={styles.historyTime}>{formatTime(item.changed_at)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const SkeletonList = () => (
    <View style={{ padding: SPACING.md }}>
      {[1, 2, 3, 4].map((n) => (
        <View key={n} style={styles.timelineRow}>
          <View style={styles.timelineLeft}>
            <View style={[styles.dot, { backgroundColor: COLORS.border }]} />
            <View style={styles.line} />
          </View>
          <View style={[styles.historyCard, { gap: 8 }]}>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <Skeleton height={14} width={60} />
              <Skeleton height={14} width={14} style={{ borderRadius: RADIUS.full }} />
              <Skeleton height={14} width={60} />
            </View>
            <Skeleton height={11} width={100} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Price History</Text>
          {ingredient?.name ? (
            <Text style={styles.headerSub} numberOfLines={1}>{ingredient.name}</Text>
          ) : null}
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Current price banner */}
      {ingredient && (
        <View style={styles.currentBanner}>
          <Text style={styles.currentLabel}>Current price</Text>
          <Text style={styles.currentPrice}>
            {symbol}{Number(ingredient.purchase_price).toFixed(2)} / {ingredient.purchase_quantity} {formatUnitLabel(ingredient.purchase_unit)}
          </Text>
        </View>
      )}

      {loading ? (
        <SkeletonList />
      ) : history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No price changes yet</Text>
          <Text style={styles.emptyDesc}>
            Price changes are recorded automatically every time you update this ingredient's purchase price.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.countNote}>
              {history.length} price change{history.length !== 1 ? 's' : ''} recorded
            </Text>
          }
        />
      )}

      <PaywallModal
        visible={showPaywall}
        onClose={handlePaywallClose}
        reason="priceHistory"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: SPACING.sm },
  headerTitle: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 1 },

  currentBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  currentLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  currentPrice: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.primary },

  list: { padding: SPACING.md },
  countNote: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },

  // Timeline
  timelineRow: { flexDirection: 'row', marginBottom: SPACING.sm },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
    marginRight: SPACING.sm,
    paddingTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.textTertiary,
    zIndex: 1,
  },
  dotUp: { backgroundColor: COLORS.error },
  dotDown: { backgroundColor: COLORS.success },
  line: {
    flex: 1,
    width: 1.5,
    backgroundColor: COLORS.border,
    marginTop: 2,
  },

  historyCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: 2,
  },
  historyCardFirst: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceChange: { flexDirection: 'row', alignItems: 'center' },
  oldPrice: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  newPrice: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.text },
  priceUp: { color: COLORS.error },
  priceDown: { color: COLORS.success },

  changeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  changeBadgeUp: { backgroundColor: '#FEE2E2' },
  changeBadgeDown: { backgroundColor: '#D1FAE5' },
  changeBadgeNeutral: { backgroundColor: COLORS.surfaceAlt },
  changeBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textSecondary },
  changeBadgeTextUp: { color: COLORS.error },
  changeBadgeTextDown: { color: COLORS.success },

  historyMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  historyDate: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary },
  historyTime: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },

  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  emptyDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
