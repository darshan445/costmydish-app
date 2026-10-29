import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { IngredientCard } from '../../components/ingredient/IngredientCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { IngredientCardSkeleton } from '../../components/ui/Skeleton';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { PaywallModal } from '../../components/paywall/PaywallModal';
import { useIngredients } from '../../hooks/useIngredients';
import { useSubscription } from '../../hooks/useSubscription';
import useIngredientStore from '../../stores/ingredientStore';
import useSettingsStore from '../../stores/settingsStore';
import { FOOD_COST_COPY as C } from '../../constants/copy';
import { track, AnalyticsEvents } from '../../lib/analytics';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';

export default function IngredientsScreen() {
  const router = useRouter();
  const { ingredients, error, refetch } = useIngredients();
  // "Loaded at least once", not `loading` (see Dishes tab)
  const hydrated = useIngredientStore((s) => s.hydrated);
  const { deleteIngredient, ensureIngredientCount } = useIngredientStore();
  const { canAddIngredient } = useSubscription();
  const getCurrencySymbol = useSettingsStore((s) => s.getCurrencySymbol);
  const symbol = getCurrencySymbol();

  const [search, setSearch] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const searchTracked = useRef(false);

  const changeSearch = (value) => {
    setSearch(value);
    if (!searchTracked.current && value.trim()) {
      searchTracked.current = true;
      track(AnalyticsEvents.LIBRARY_SEARCHED, { ingredient_count: ingredients.length });
    }
  };

  const filtered = ingredients.filter((i) => {
    const q = search.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!q) return true;
    return i.name.toLowerCase().trim().includes(q);
  });

  const handleAdd = async (source) => {
    const libraryCount = await ensureIngredientCount();
    track(AnalyticsEvents.INGREDIENT_ADD_TAPPED, {
      source,
      ingredient_count: libraryCount,
      at_limit: !canAddIngredient(libraryCount),
    });
    if (!canAddIngredient(libraryCount)) {
      track(AnalyticsEvents.PAYWALL_TRIGGERED, { reason: 'ingredient', source: 'library_tab' });
      setShowPaywall(true);
      return;
    }
    router.push('/ingredient/create');
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    await deleteIngredient(pendingDelete.id);
    track(AnalyticsEvents.INGREDIENT_DELETED, { ingredient_count_after: Math.max(0, ingredients.length - 1) });
    setDeleting(false);
    setPendingDelete(null);
  };

  const showSkeleton = !hydrated && !error;
  const showLoadError = !hydrated && Boolean(error);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{C.library.title}</Text>
          <Text style={styles.headerSub}>
            {!hydrated
              ? C.library.subtitle
              : `${ingredients.length} item${ingredients.length === 1 ? '' : 's'} · ${C.library.subtitle}`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleAdd('library_header')} style={styles.addBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="add-circle" size={32} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textTertiary} style={{ marginRight: SPACING.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search library…"
          placeholderTextColor={COLORS.textTertiary}
          value={search}
          onChangeText={changeSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {showSkeleton ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => <IngredientCardSkeleton key={n} />)}
        </ScrollView>
      ) : showLoadError ? (
        <EmptyState
          icon="📡"
          title={C.library.loadError}
          actionLabel={C.home.retry}
          onAction={refetch}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <IngredientCard
              ingredient={item}
              currencySymbol={symbol}
              onPress={() => {
                track(AnalyticsEvents.INGREDIENT_EDIT_OPENED, { source: 'library_tab' });
                router.push(`/ingredient/edit/${item.id}`);
              }}
              onDelete={() => {
                track(AnalyticsEvents.INGREDIENT_DELETE_TAPPED);
                setPendingDelete({ id: item.id, name: item.name });
              }}
            />
          )}
          ListEmptyComponent={
            search.length > 0 ? (
              <EmptyState icon="🔍" title="No results" description={`No items matching "${search}"`} />
            ) : (
              <EmptyState
                icon="🥕"
                title={C.library.emptyTitle}
                description={C.library.emptyDescription}
                actionLabel="Add to library"
                onAction={() => handleAdd('library_empty')}
              />
            )
          }
          ListFooterComponent={
            filtered.length > 0 && search.length === 0 ? (
              <TouchableOpacity style={styles.ctaFooter} onPress={() => handleAdd('library_footer')} activeOpacity={0.7}>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} style={{ marginRight: SPACING.xs }} />
                <Text style={styles.ctaText}>Add another to library</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      <ConfirmModal
        visible={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Remove from library"
        message={`Remove "${pendingDelete?.name}" from your library? Food costs that use it may be affected.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
      />

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} reason="ingredient" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  headerText: { flex: 1, marginRight: SPACING.sm },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2 },
  addBtn: { padding: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.text },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, flexGrow: 1 },
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
  },
  ctaText: { fontSize: FONT_SIZE.base, color: COLORS.primary, fontWeight: '600' },
});
