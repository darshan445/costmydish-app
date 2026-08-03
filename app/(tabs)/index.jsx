import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { Skeleton, RecipeCardSkeleton } from '../../components/ui/Skeleton';
import { PaywallModal } from '../../components/paywall/PaywallModal';
import { Button } from '../../components/ui/Button';
import { useRecipes } from '../../hooks/useRecipes';
import { useCalculateFoodCost } from '../../hooks/useCalculateFoodCost';
import useAuthStore from '../../stores/authStore';
import useSettingsStore from '../../stores/settingsStore';
import { formatFoodCostPercent } from '../../utils/format';
import { normalizeFoodCostPercent } from '../../lib/calculations';
import {
  clearFoodCostDraft,
  getDraftDisplayName,
  getDraftStepLabel,
  isMeaningfulDraft,
  loadFoodCostDraft,
} from '../../lib/foodCostDraft';
import { showAppAlert } from '../../lib/appAlert';
import { trackFoodCost } from '../../lib/foodCostAnalytics';
import { FOOD_COST_COPY as C } from '../../constants/copy';
import { COLORS, FONT_SIZE, RADIUS, SPACING, SHADOW } from '../../constants/theme';

function EmptyHomeCoach({ onCalculate }) {
  return (
    <View style={styles.coachWrap}>
      <Text style={styles.coachTitle}>{C.home.coachTitle}</Text>
      <Text style={styles.coachSub}>{C.home.coachSub}</Text>

      <View style={styles.stepsCard}>
        {C.home.coachSteps.map((step, idx) => (
          <View key={step.n}>
            {idx > 0 ? <View style={styles.stepDivider} /> : null}
            <View style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{step.n}</Text>
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepHint}>{step.hint}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <Button title={C.action.calculate} onPress={onCalculate} size="lg" style={styles.coachCta} />
    </View>
  );
}

function DraftResumeCard({ draft, onContinue, onDiscard }) {
  const step = draft?.step ?? 1;
  const progress = Math.min(Math.max(step, 1), 3) / 3;

  return (
    <View style={styles.draftCard}>
      <Text style={styles.draftEyebrow}>{C.home.draftEyebrow}</Text>
      <Text style={styles.draftTitle}>{C.home.draftTitle}</Text>
      <Text style={styles.draftName} numberOfLines={1}>{getDraftDisplayName(draft)}</Text>
      <Text style={styles.draftStep}>{getDraftStepLabel(step)}</Text>
      <View style={styles.draftTrack}>
        <View style={[styles.draftFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.draftActions}>
        <TouchableOpacity style={styles.draftDiscardBtn} onPress={onDiscard} activeOpacity={0.7}>
          <Text style={styles.draftDiscardText}>{C.action.discard}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.draftContinueBtn} onPress={onContinue} activeOpacity={0.85}>
          <Text style={styles.draftContinueText}>{C.action.continue}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { recipes, costSummaries, loading } = useRecipes();
  const { startCalculate, resumeCalculate, showPaywall, closePaywall } = useCalculateFoodCost();
  const getCurrencySymbol = useSettingsStore((s) => s.getCurrencySymbol);
  const symbol = getCurrencySymbol();
  const [draft, setDraft] = useState(null);

  const refreshDraft = useCallback(async () => {
    const next = await loadFoodCostDraft();
    setDraft(isMeaningfulDraft(next) ? next : null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshDraft();
    }, [refreshDraft]),
  );

  const handleDiscardDraft = () => {
    showAppAlert({
      title: C.home.discardTitle,
      message: C.home.discardMessage,
      variant: 'warning',
      primaryLabel: C.action.keepDraft,
      secondaryLabel: C.action.discard,
      onSecondary: async () => {
        await clearFoodCostDraft();
        trackFoodCost('draft_discarded', { source: 'home' });
        setDraft(null);
      },
    });
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

  if (showSkeleton) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Skeleton height={24} width={180} style={{ marginBottom: 8 }} />
            <Skeleton height={14} width={240} />
          </View>
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
          <Skeleton height={17} width={130} style={{ marginBottom: SPACING.sm, marginTop: SPACING.xs }} />
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
            {draft ? (
              <DraftResumeCard
                draft={draft}
                onContinue={resumeCalculate}
                onDiscard={handleDiscardDraft}
              />
            ) : null}

            {hasRecipes ? (
              <View>
                <View style={styles.header}>
                  <Text style={styles.greeting}>{greeting}</Text>
                  <Text style={styles.subtitle}>{C.home.greetingSubtitle}</Text>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{recipes.length}</Text>
                    <Text style={styles.statLabel}>{C.home.totalDishes}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statValue, overTargetCount > 0 && styles.statValueDanger]}>
                      {overTargetCount}
                    </Text>
                    <Text style={styles.statLabel}>Over Target</Text>
                    {overTargetCount === 0 && (
                      <Text style={styles.allGoodLabel}>All good ✓</Text>
                    )}
                  </View>
                </View>

                {overTargetCount > 0 && (
                  <View style={styles.attentionSection}>
                    <Text style={styles.attentionTitle}>Needs attention</Text>
                    {overTargetRecipes.map((r) => {
                      const summary = costSummaries[r.id];
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

                <Text style={styles.sectionTitle}>{C.home.recentTitle}</Text>
              </View>
            ) : null}
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
          !loading && !draft ? (
            <EmptyHomeCoach onCalculate={() => startCalculate({ source: 'home' })} />
          ) : null
        }
        ListFooterComponent={
          recentRecipes.length > 0 ? (
            <TouchableOpacity
              style={styles.createCta}
              onPress={() => startCalculate({ source: 'home' })}
              activeOpacity={0.7}
            >
              <Ionicons
                name="calculator-outline"
                size={18}
                color={COLORS.primary}
                style={{ marginRight: SPACING.xs }}
              />
              <Text style={styles.createCtaText}>{C.action.calculateAnother}</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      <PaywallModal visible={showPaywall} onClose={closePaywall} reason="recipe" />
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
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },
  attentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
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

  draftCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.sm,
  },
  draftEyebrow: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
  },
  draftTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
    color: COLORS.text,
  },
  draftName: {
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginTop: SPACING.xs,
  },
  draftStep: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: SPACING.sm,
  },
  draftTrack: {
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  draftFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  draftActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  draftDiscardBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftDiscardText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  draftContinueBtn: {
    flex: 1.2,
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftContinueText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.surface,
  },

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

  coachWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  coachTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  coachSub: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  stepsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOW.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  stepDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  stepBadgeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
    color: COLORS.primary,
  },
  stepCopy: { flex: 1 },
  stepTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
    color: COLORS.text,
  },
  stepHint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  coachCta: { alignSelf: 'stretch' },
});
