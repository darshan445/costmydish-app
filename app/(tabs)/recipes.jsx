import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { RecipeCardSkeleton } from '../../components/ui/Skeleton';
import { PaywallModal } from '../../components/paywall/PaywallModal';
import { useRecipes } from '../../hooks/useRecipes';
import { useSubscription } from '../../hooks/useSubscription';
import useSettingsStore from '../../stores/settingsStore';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';

export default function RecipesScreen() {
  const router = useRouter();
  const { recipes, costSummaries, loading } = useRecipes();
  const { canCreateRecipe } = useSubscription();
  const getCurrencySymbol = useSettingsStore((s) => s.getCurrencySymbol);
  const symbol = getCurrencySymbol();

  const [showPaywall, setShowPaywall] = useState(false);

  const handleCreate = () => {
    if (!canCreateRecipe(recipes.length)) {
      setShowPaywall(true);
      return;
    }
    router.push('/recipe/create');
  };

  const showSkeleton = loading && recipes.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Recipes</Text>
        <TouchableOpacity
          onPress={handleCreate}
          style={styles.addBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
          title="No recipes yet"
          description="Create your first recipe to see a full cost breakdown."
          actionLabel="Create Recipe"
          onAction={handleCreate}
        />
      ) : (
        <>
          <FlatList
            data={recipes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <RecipeCard
                recipe={item}
                costSummary={costSummaries[item.id] ?? null}
                currencySymbol={symbol}
                onPress={() => router.push(`/recipe/${item.id}`)}
              />
            )}
            ListFooterComponent={
              recipes.length > 0 ? (
                <TouchableOpacity
                  style={styles.ctaFooter}
                  onPress={handleCreate}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color={COLORS.primary}
                    style={{ marginRight: SPACING.xs }}
                  />
                  <Text style={styles.ctaText}>
                    Add your next recipe
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />
        </>
      )}
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} reason="recipe" />
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
  addBtn: { padding: 4 },

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
  },
  ctaText: { fontSize: FONT_SIZE.base, color: COLORS.primary, fontWeight: '600' },
});
