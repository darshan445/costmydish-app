import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { KeyboardFormLayout } from '../../../components/ui/KeyboardFormLayout';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import useIngredientStore from '../../../stores/ingredientStore';
import useRecipeStore from '../../../stores/recipeStore';
import useSettingsStore from '../../../stores/settingsStore';
import { supabase } from '../../../lib/supabase';
import { formatFoodCostPercent } from '../../../utils/format';
import { COLORS, FONT_SIZE, RADIUS, SPACING, SHADOW } from '../../../constants/theme';
import { useSubscription } from '../../../hooks/useSubscription';
import { useUnitSystem } from '../../../hooks/useUnitSystem';
import { formatUnitLabel } from '../../../constants/units';

function computeCostHint(price, qty, unit, symbol) {
  const q = parseFloat(qty) || 1;
  const p = parseFloat(price);
  const displayPrice = p > 0 ? p : 120;
  const prefix = p > 0 ? '' : 'e.g. ';
  return `${prefix}Bought ${q} ${formatUnitLabel(unit)} for ${symbol}${displayPrice}`;
}

export default function EditIngredientScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { getIngredientById, updateIngredient, deleteIngredient } = useIngredientStore();
  const { fetchRecipes } = useRecipeStore();
  const getCurrencySymbol = useSettingsStore((s) => s.getCurrencySymbol);
  const symbol = getCurrencySymbol();

  const { canViewPriceHistory } = useSubscription();
  const { unitGroups, defaultPurchaseUnit } = useUnitSystem();
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [impactData, setImpactData] = useState(null);
  const [showImpactModal, setShowImpactModal] = useState(false);

  const ingredient = getIngredientById(id);

  const { control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name: '',
      purchase_price: '',
      purchase_quantity: '1',
      purchase_unit: defaultPurchaseUnit,
      waste_percent: '0',
      notes: '',
    },
  });

  useEffect(() => {
    if (ingredient) {
      reset({
        name: ingredient.name,
        purchase_price: String(ingredient.purchase_price),
        purchase_quantity: String(ingredient.purchase_quantity),
        purchase_unit: ingredient.purchase_unit,
        waste_percent: String(ingredient.waste_percent ?? 0),
        notes: ingredient.notes ?? '',
      });
    }
  }, [ingredient]);

  const [watchPrice, watchQty, watchUnit] = watch(['purchase_price', 'purchase_quantity', 'purchase_unit']);

  const costHint = useMemo(
    () => computeCostHint(watchPrice, watchQty, watchUnit, symbol),
    [watchPrice, watchQty, watchUnit, symbol]
  );

  const onSubmit = async (data) => {
    const { error } = await updateIngredient(id, {
      name: data.name,
      purchase_price: parseFloat(data.purchase_price),
      purchase_quantity: parseFloat(data.purchase_quantity),
      purchase_unit: data.purchase_unit,
      waste_percent: parseFloat(data.waste_percent) || 0,
      notes: data.notes || null,
    });
    if (error) { Alert.alert('Error', error); return; }

    try {
      const { data: riRows } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id')
        .eq('ingredient_id', id);

      const affectedIds = new Set((riRows ?? []).map((r) => r.recipe_id));

      if (affectedIds.size > 0) {
        await fetchRecipes();
        const { recipes: updatedRecipes, costSummaries: updatedSummaries } = useRecipeStore.getState();
        const affected = updatedRecipes
          .filter((r) => affectedIds.has(r.id))
          .map((r) => ({
            id: r.id,
            name: r.name,
            actualPercent: updatedSummaries[r.id]?.actual_food_cost_percent ?? null,
            marginStatus: updatedSummaries[r.id]?.marginStatus ?? null,
            targetPercent: r.target_food_cost_percent,
          }));

        setImpactData({
          ingredientName: data.name,
          newPrice: parseFloat(data.purchase_price),
          quantity: parseFloat(data.purchase_quantity),
          unit: data.purchase_unit,
          affected,
        });
        setShowImpactModal(true);
        return;
      }
    } catch (_) {
      // silently proceed
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteIngredient(id);
      setShowDeleteConfirm(false);
      router.back();
    } finally {
      setDeleting(false);
    }
  };

  if (!ingredient) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFoundText}>Ingredient not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit ingredient</Text>
        <TouchableOpacity onPress={() => setShowDeleteConfirm(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.headerBtn}>
          <Ionicons name="trash-outline" size={22} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      <KeyboardFormLayout
        contentContainerStyle={styles.scroll}
        footer={(
          <View style={styles.stickyFooter}>
            <Button title="Save changes" onPress={handleSubmit(onSubmit)} loading={isSubmitting} size="lg" />
          </View>
        )}
      >

          {/* Name */}
          <Controller control={control} name="name" rules={{ required: 'Name is required' }}
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Name</Text>
                <View style={[styles.inputBox, errors.name && styles.inputBoxError]}>
                  <TextInput
                    style={styles.textInput}
                    value={value}
                    onChangeText={onChange}
                    placeholder="e.g. Butter, All-purpose flour..."
                    placeholderTextColor={COLORS.textTertiary}
                    autoCapitalize="words"
                  />
                </View>
                {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
              </View>
            )} />

          {/* Purchase Info */}
          <Text style={styles.sectionLabel}>PURCHASE INFO</Text>
          <Text style={styles.sectionSub}>How much did you buy and what did you pay?</Text>

          <View style={styles.purchaseCard}>
            <View style={styles.purchaseRow}>
              {/* Price */}
              <Controller control={control} name="purchase_price" rules={{ required: 'Required' }}
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.purchaseCol, { flex: 1.1 }]}>
                    <Text style={styles.colLabel}>Price paid</Text>
                    <View style={[styles.inputBox, styles.priceBox, errors.purchase_price && styles.inputBoxError]}>
                      <Text style={styles.currencyPrefix}>{symbol}</Text>
                      <TextInput
                        style={[styles.textInput, { flex: 1 }]}
                        value={value}
                        onChangeText={onChange}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={COLORS.textTertiary}
                      />
                    </View>
                  </View>
                )} />

              <View style={styles.purchaseColGap} />

              {/* Quantity */}
              <Controller control={control} name="purchase_quantity"
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.purchaseCol, { flex: 0.8 }]}>
                    <Text style={styles.colLabel}>Quantity</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.textInput}
                        value={value}
                        onChangeText={onChange}
                        keyboardType="numeric"
                        placeholder="1"
                        placeholderTextColor={COLORS.textTertiary}
                      />
                    </View>
                  </View>
                )} />

              <View style={styles.purchaseColGap} />

              {/* Unit */}
              <Controller control={control} name="purchase_unit"
                render={({ field: { value } }) => (
                  <View style={[styles.purchaseCol, { flex: 0.7 }]}>
                    <Text style={styles.colLabel}>Unit</Text>
                    <TouchableOpacity
                      style={[styles.inputBox, styles.unitBox]}
                      onPress={() => setShowUnitPicker(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.unitText}>{formatUnitLabel(value)}</Text>
                      <Ionicons name="chevron-down" size={12} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )} />
            </View>

            {/* Dynamic cost hint */}
            <Text style={styles.costHint}>{costHint}</Text>
          </View>

          <TouchableOpacity
            style={styles.priceHistoryRow}
            onPress={() => router.push(`/ingredient/price-history/${id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.priceHistoryIconWrap}>
              <Ionicons
                name="trending-up-outline"
                size={20}
                color={canViewPriceHistory ? COLORS.primary : COLORS.textTertiary}
              />
            </View>
            <View style={styles.priceHistoryText}>
              <Text style={styles.priceHistoryTitle}>Price history</Text>
              <Text style={styles.priceHistorySub}>See how this price has changed over time</Text>
            </View>
            <Ionicons
              name={canViewPriceHistory ? 'chevron-forward' : 'lock-closed-outline'}
              size={16}
              color={COLORS.textTertiary}
            />
          </TouchableOpacity>

          {/* Waste % */}
          <Controller control={control} name="waste_percent"
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Waste %</Text>
                  <Text style={styles.optionalTag}>optional</Text>
                </View>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    value={value}
                    onChangeText={onChange}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={COLORS.textTertiary}
                  />
                </View>
                <Text style={styles.hintText}>% lost to peeling, trimming, cooking or spoilage</Text>
              </View>
            )} />

          {/* Notes */}
          <Controller control={control} name="notes"
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Notes</Text>
                  <Text style={styles.optionalTag}>optional</Text>
                </View>
                <View style={[styles.inputBox, styles.multilineBox]}>
                  <TextInput
                    style={[styles.textInput, styles.multilineInput]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Brand, supplier, storage tip..."
                    placeholderTextColor={COLORS.textTertiary}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            )} />

      </KeyboardFormLayout>

      {/* Unit Picker Modal */}
      <Modal visible={showUnitPicker} onClose={() => setShowUnitPicker(false)} title="Select unit">
          {unitGroups.map((group) => (
            <View key={group.label} style={styles.unitGroup}>
              <Text style={styles.unitGroupLabel}>{group.label}</Text>
              <View style={styles.unitChipRow}>
                {group.units.map((u) => {
                  const active = watchUnit === u.value;
                  return (
                    <TouchableOpacity
                      key={u.value}
                      style={[styles.unitChip, active && styles.unitChipActive]}
                      onPress={() => { setValue('purchase_unit', u.value); setShowUnitPicker(false); }}
                    >
                      <Text style={[styles.unitChipText, active && styles.unitChipTextActive]}>{u.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
      </Modal>

      <ConfirmModal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Ingredient"
        message="This will remove it from your ingredient library. Existing recipe costs may be affected."
        confirmLabel="Delete Ingredient"
        cancelLabel="Keep Ingredient"
        variant="danger"
        loading={deleting}
      />

      {/* Recipe impact modal */}
      <Modal
        visible={showImpactModal}
        onClose={() => setShowImpactModal(false)}
        title="Price Updated"
      >
        {impactData && (
          <View>
            <Text style={styles.impactSummary}>
              {impactData.ingredientName} updated to {symbol}{impactData.newPrice} / {impactData.quantity} {formatUnitLabel(impactData.unit)}
            </Text>

            <View style={styles.impactDivider} />

            <Text style={styles.impactSubheading}>
              {impactData.affected.length} {impactData.affected.length === 1 ? 'recipe' : 'recipes'} affected
            </Text>

            {impactData.affected.map((r) => {
              const isOver = r.marginStatus === 'danger';
              const isWarn = r.marginStatus === 'warning';
              const isGood = r.marginStatus === 'good';
              const color = isOver ? COLORS.error : isWarn ? COLORS.warning : isGood ? COLORS.success : COLORS.textSecondary;
              const icon = isOver ? '⬆' : isGood ? '✓' : '~';
              const label = r.actualPercent != null
                ? `${formatFoodCostPercent(r.actualPercent)} ${isOver ? 'over target' : isGood ? 'still on target' : 'near target'}`
                : 'no selling price set';

              return (
                <View key={r.id} style={styles.impactRow}>
                  <Text style={styles.impactRecipeName} numberOfLines={1}>{r.name}</Text>
                  <Text style={[styles.impactStatus, { color }]}>
                    {r.actualPercent != null ? `→ ${icon} ` : ''}{label}
                  </Text>
                </View>
              );
            })}

            <Button
              title="Got it"
              onPress={() => setShowImpactModal(false)}
              size="lg"
              style={styles.impactBtn}
            />
          </View>
        )}
      </Modal>
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
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text, flex: 1, textAlign: 'center' },
  headerBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  notFoundText: { textAlign: 'center', color: COLORS.error, padding: SPACING.xl },

  fieldGroup: { marginBottom: SPACING.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  fieldLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  optionalTag: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    minHeight: 44,
  },
  inputBoxError: { borderColor: COLORS.error },
  textInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    minHeight: 44,
  },
  multilineBox: { alignItems: 'flex-start' },
  multilineInput: { minHeight: 60, paddingTop: SPACING.sm, textAlignVertical: 'top' },

  stickyFooter: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  errorText: { fontSize: FONT_SIZE.xs, color: COLORS.error, marginTop: SPACING.xs },
  hintText: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: SPACING.xs },

  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 0.8,
    marginTop: SPACING.sm,
    marginBottom: 2,
  },
  sectionSub: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },

  purchaseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.sm,
  },
  purchaseRow: { flexDirection: 'row', alignItems: 'flex-start' },
  purchaseCol: { },
  purchaseColGap: { width: SPACING.sm },
  colLabel: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs },
  priceBox: { flexDirection: 'row', alignItems: 'center' },
  currencyPrefix: {
    paddingLeft: SPACING.md,
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    fontWeight: '500',
  },
  unitBox: { justifyContent: 'space-between', paddingHorizontal: SPACING.sm },
  unitText: { fontSize: FONT_SIZE.base, color: COLORS.text, fontWeight: '500' },
  costHint: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: SPACING.sm },

  priceHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    minHeight: 56,
    gap: SPACING.sm,
  },
  priceHistoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceHistoryText: { flex: 1 },
  priceHistoryTitle: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.text },
  priceHistorySub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },

  // Unit picker
  unitGroup: { marginBottom: SPACING.md },
  unitGroupLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textTertiary, letterSpacing: 0.6, marginBottom: SPACING.sm },
  unitChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  unitChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  unitChipActive: { borderColor: COLORS.primary, backgroundColor: '#D1FAE5' },
  unitChipText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  unitChipTextActive: { color: COLORS.primary, fontWeight: '700' },

  // Impact modal
  impactSummary: { fontSize: FONT_SIZE.base, color: COLORS.text, marginBottom: SPACING.md },
  impactDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.md },
  impactSubheading: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  impactRecipeName: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.text, flex: 1 },
  impactStatus: { fontSize: FONT_SIZE.sm, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  impactBtn: { marginTop: SPACING.lg },
});
