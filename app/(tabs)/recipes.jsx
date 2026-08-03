import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { RecipeCardSkeleton } from '../../components/ui/Skeleton';
import { PaywallModal } from '../../components/paywall/PaywallModal';
import { useRecipes } from '../../hooks/useRecipes';
import { useCalculateFoodCost } from '../../hooks/useCalculateFoodCost';
import useSettingsStore from '../../stores/settingsStore';
import { FOOD_COST_COPY as C } from '../../constants/copy';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'on_target', label: 'On Target' },
  { key: 'over_target', label: 'Over Target' },
];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'food_cost', label: 'Highest food cost' },
  { key: 'profit', label: 'Highest profit' },
];

function getDishStatus(summary) {
  if (!summary || summary.format_count < 1) return null;
  if (summary.worst_margin_status === 'danger' || summary.has_danger_format || summary.worst_margin_status === 'warning') {
    return 'over_target';
  }
  if (summary.worst_margin_status === 'good' || summary.marginStatus === 'good') {
    return 'on_target';
  }
  return null;
}

function getFoodCostSortValue(summary) {
  if (!summary) return -Infinity;
  if (summary.worst_food_cost_percent != null) return summary.worst_food_cost_percent;
  if (summary.actual_food_cost_percent != null) return summary.actual_food_cost_percent;
  return -Infinity;
}

function getProfitSortValue(summary) {
  if (!summary) return -Infinity;
  if (summary.format_profits?.length > 0) return Math.max(...summary.format_profits);
  if (summary.gross_profit != null) return summary.gross_profit;
  return -Infinity;
}

export default function DishesScreen() {
  const router = useRouter();
  const { recipes, costSummaries, loading } = useRecipes();
  const { startCalculate, showPaywall, closePaywall } = useCalculateFoodCost();
  const getCurrencySymbol = useSettingsStore((s) => s.getCurrencySymbol);
  const symbol = getCurrencySymbol();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const showSkeleton = loading && recipes.length === 0;

  const filteredDishes = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = recipes.filter((r) => {
      if (q && !r.name?.toLowerCase().includes(q)) return false;
      if (statusFilter === 'all') return true;
      return getDishStatus(costSummaries[r.id]) === statusFilter;
    });

    list = [...list].sort((a, b) => {
      const sa = costSummaries[a.id];
      const sb = costSummaries[b.id];
      if (sortBy === 'food_cost') {
        return getFoodCostSortValue(sb) - getFoodCostSortValue(sa);
      }
      if (sortBy === 'profit') {
        return getProfitSortValue(sb) - getProfitSortValue(sa);
      }
      const aTime = new Date(a.created_at ?? 0).getTime();
      const bTime = new Date(b.created_at ?? 0).getTime();
      return bTime - aTime;
    });

    return list;
  }, [recipes, costSummaries, search, statusFilter, sortBy]);

  const activeSortLabel = SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? 'Newest';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{C.dishes.title}</Text>
          <Text style={styles.subtitle}>{C.dishes.subtitle}</Text>
        </View>
        <TouchableOpacity
          onPress={() => startCalculate({ source: 'dishes' })}
          style={styles.addBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={C.action.calculateA11y}
        >
          <Ionicons name="add-circle" size={32} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {showSkeleton ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {[1, 2, 3, 4, 5].map((n) => <RecipeCardSkeleton key={n} />)}
        </ScrollView>
      ) : recipes.length === 0 ? (
        <EmptyState
          icon="🍽️"
          title={C.dishes.emptyTitle}
          description={C.dishes.emptyDescription}
          actionLabel={C.action.calculate}
          onAction={() => startCalculate({ source: 'dishes' })}
        />
      ) : (
        <>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.textTertiary} style={{ marginRight: SPACING.sm }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search dishes…"
              placeholderTextColor={COLORS.textTertiary}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.toolbar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setStatusFilter(f.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.sortBtn}
              onPress={() => setShowSortMenu((v) => !v)}
              activeOpacity={0.75}
            >
              <Ionicons name="swap-vertical" size={16} color={COLORS.primary} />
              <Text style={styles.sortBtnText} numberOfLines={1}>{activeSortLabel}</Text>
              <Ionicons
                name={showSortMenu ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          {showSortMenu ? (
            <View style={styles.sortMenu}>
              {SORT_OPTIONS.map((opt) => {
                const active = sortBy === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={styles.sortOption}
                    onPress={() => {
                      setSortBy(opt.key);
                      setShowSortMenu(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sortOptionText, active && styles.sortOptionTextActive]}>
                      {opt.label}
                    </Text>
                    {active ? <Ionicons name="checkmark" size={18} color={COLORS.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <FlatList
            data={filteredDishes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => setShowSortMenu(false)}
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
                icon="🔍"
                title="No dishes match"
                description={
                  search.trim()
                    ? `No dishes matching “${search.trim()}”.`
                    : statusFilter === 'on_target'
                      ? 'No dishes are on target right now.'
                      : statusFilter === 'over_target'
                        ? 'No dishes are over target right now.'
                        : 'No dishes to show.'
                }
              />
            }
            ListFooterComponent={
              filteredDishes.length > 0 && !search && statusFilter === 'all' ? (
                <TouchableOpacity
                  style={styles.ctaFooter}
                  onPress={() => startCalculate({ source: 'dishes' })}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="calculator-outline"
                    size={18}
                    color={COLORS.primary}
                    style={{ marginRight: SPACING.xs }}
                  />
                  <Text style={styles.ctaText}>{C.action.calculateAnother}</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        </>
      )}
      <PaywallModal visible={showPaywall} onClose={closePaywall} reason="recipe" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text },
  headerText: { flex: 1, paddingRight: SPACING.sm },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  addBtn: { padding: 4 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 44,
  },
  searchInput: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.text, paddingVertical: 0 },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingRight: SPACING.xs,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.surface,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    maxWidth: 148,
    minHeight: 36,
  },
  sortBtnText: {
    flexShrink: 1,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sortMenu: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sortOptionText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
  },
  sortOptionTextActive: {
    fontWeight: '700',
    color: COLORS.primary,
  },

  list: { padding: SPACING.md, flexGrow: 1 },

  ctaFooter: {
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
  ctaText: { fontSize: FONT_SIZE.base, color: COLORS.primary, fontWeight: '600' },
});
