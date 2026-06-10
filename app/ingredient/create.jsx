import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { KeyboardFormLayout } from '../../components/ui/KeyboardFormLayout';
import { PaywallModal } from '../../components/paywall/PaywallModal';
import useIngredientStore from '../../stores/ingredientStore';
import useSettingsStore from '../../stores/settingsStore';
import { useSubscription } from '../../hooks/useSubscription';
import { useUnitSystem } from '../../hooks/useUnitSystem';
import { formatUnitLabel } from '../../constants/units';
import { COLORS, FONT_SIZE, RADIUS, SPACING, SHADOW } from '../../constants/theme';

let _draftId = 0;
function newDraftId() {
  _draftId += 1;
  return `draft-${_draftId}`;
}

function createEmptyCard(defaultUnit) {
  return {
    draftId: newDraftId(),
    name: '',
    purchase_price: '',
    purchase_quantity: '1',
    purchase_unit: defaultUnit,
    waste_percent: '0',
    notes: '',
    showOptional: false,
  };
}

function computeCostHint(price, qty, unit, symbol) {
  const q = parseFloat(qty) || 1;
  const p = parseFloat(price);
  if (!price?.trim() || Number.isNaN(p) || p <= 0) return null;
  return `Bought ${q} ${formatUnitLabel(unit)} for ${symbol}${p.toFixed(2)}`;
}

function isCardFilled(card) {
  return Boolean(
    card.name?.trim()
    || card.purchase_price?.trim()
    || card.notes?.trim()
    || (card.waste_percent && card.waste_percent !== '0'),
  );
}

function parseCard(card) {
  return {
    name: card.name.trim(),
    category_id: null,
    purchase_price: parseFloat(card.purchase_price),
    purchase_quantity: parseFloat(card.purchase_quantity) || 1,
    purchase_unit: card.purchase_unit,
    waste_percent: parseFloat(card.waste_percent) || 0,
    notes: card.notes?.trim() || null,
    is_archived: false,
  };
}

function validateCard(card, reservedNames) {
  if (!isCardFilled(card)) return null;

  if (!card.name?.trim()) return { field: 'name', message: 'Name is required' };
  const price = parseFloat(card.purchase_price);
  if (!card.purchase_price?.trim() || Number.isNaN(price) || price < 0) {
    return { field: 'purchase_price', message: 'Enter a valid price' };
  }
  const qty = parseFloat(card.purchase_quantity);
  if (Number.isNaN(qty) || qty <= 0) return { field: 'purchase_quantity', message: 'Enter a valid quantity' };

  const nameKey = card.name.trim().toLowerCase();
  if (reservedNames.has(nameKey)) {
    return { field: 'name', message: `"${card.name.trim()}" is already used` };
  }
  reservedNames.add(nameKey);
  return null;
}

function IngredientDraftCard({
  card,
  index,
  symbol,
  canRemove,
  errors,
  onChange,
  onRemove,
  onOpenUnitPicker,
}) {
  const costHint = useMemo(
    () => computeCostHint(card.purchase_price, card.purchase_quantity, card.purchase_unit, symbol),
    [card.purchase_price, card.purchase_quantity, card.purchase_unit, symbol],
  );

  return (
    <View style={styles.ingredientCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Ingredient {index + 1}</Text>
        {canRemove && (
          <TouchableOpacity
            onPress={onRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.cardRemoveBtn}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Name</Text>
        <View style={[styles.inputBox, errors?.name && styles.inputBoxError]}>
          <TextInput
            style={styles.textInput}
            value={card.name}
            onChangeText={(v) => onChange('name', v)}
            placeholder="e.g. Butter, Flour..."
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="words"
          />
        </View>
        {errors?.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
      </View>

      <Text style={styles.purchaseLabel}>Purchase info</Text>
      <View style={styles.purchaseRow}>
        <View style={[styles.purchaseCol, { flex: 1.1 }]}>
          <Text style={styles.colLabel}>Price</Text>
          <View style={[styles.inputBox, styles.priceBox, errors?.purchase_price && styles.inputBoxError]}>
            <Text style={styles.currencyPrefix}>{symbol}</Text>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              value={card.purchase_price}
              onChangeText={(v) => onChange('purchase_price', v)}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
          {errors?.purchase_price ? <Text style={styles.errorText}>{errors.purchase_price}</Text> : null}
        </View>

        <View style={styles.purchaseColGap} />

        <View style={[styles.purchaseCol, { flex: 0.75 }]}>
          <Text style={styles.colLabel}>Qty</Text>
          <View style={[styles.inputBox, errors?.purchase_quantity && styles.inputBoxError]}>
            <TextInput
              style={styles.textInput}
              value={card.purchase_quantity}
              onChangeText={(v) => onChange('purchase_quantity', v)}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
        </View>

        <View style={styles.purchaseColGap} />

        <View style={[styles.purchaseCol, { flex: 0.75 }]}>
          <Text style={styles.colLabel}>Unit</Text>
          <TouchableOpacity
            style={[styles.inputBox, styles.unitBox]}
            onPress={onOpenUnitPicker}
            activeOpacity={0.7}
          >
            <Text style={styles.unitText} numberOfLines={1}>{formatUnitLabel(card.purchase_unit)}</Text>
            <Ionicons name="chevron-down" size={12} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {costHint ? <Text style={styles.costHint}>{costHint}</Text> : null}

      <TouchableOpacity
        style={styles.optionalToggle}
        onPress={() => onChange('showOptional', !card.showOptional)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={card.showOptional ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={COLORS.textSecondary}
        />
        <Text style={styles.optionalToggleText}>
          {card.showOptional ? 'Hide optional fields' : 'Waste % & notes (optional)'}
        </Text>
      </TouchableOpacity>

      {card.showOptional && (
        <View style={styles.optionalFields}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Waste %</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                value={card.waste_percent}
                onChangeText={(v) => onChange('waste_percent', v)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
          </View>
          <View style={[styles.fieldGroup, { marginBottom: 0 }]}>
            <Text style={styles.fieldLabel}>Notes</Text>
            <View style={[styles.inputBox, styles.multilineBox]}>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={card.notes}
                onChangeText={(v) => onChange('notes', v)}
                placeholder="Brand, supplier..."
                placeholderTextColor={COLORS.textTertiary}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export default function CreateIngredientScreen() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const { addIngredient, ingredients } = useIngredientStore();
  const getCurrencySymbol = useSettingsStore((s) => s.getCurrencySymbol);
  const { canAddIngredient } = useSubscription();
  const { unitGroups, defaultPurchaseUnit } = useUnitSystem();
  const symbol = getCurrencySymbol();

  const [cards, setCards] = useState(() => [createEmptyCard(defaultPurchaseUnit)]);
  const [cardErrors, setCardErrors] = useState({});
  const [unitPickerDraftId, setUnitPickerDraftId] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [saving, setSaving] = useState(false);

  const filledCount = cards.filter(isCardFilled).length;
  const unitPickerCard = cards.find((c) => c.draftId === unitPickerDraftId);

  const updateCard = (draftId, field, value) => {
    setCards((prev) => prev.map((c) => (c.draftId === draftId ? { ...c, [field]: value } : c)));
    setCardErrors((prev) => {
      if (!prev[draftId]) return prev;
      const next = { ...prev[draftId] };
      delete next[field];
      if (Object.keys(next).length === 0) {
        const { [draftId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [draftId]: next };
    });
  };

  const addCard = () => {
    setCards((prev) => [...prev, createEmptyCard(defaultPurchaseUnit)]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const removeCard = (draftId) => {
    setCards((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((c) => c.draftId !== draftId);
    });
    setCardErrors((prev) => {
      const { [draftId]: _, ...rest } = prev;
      return rest;
    });
  };

  const saveAll = async () => {
    const filledCards = cards.filter(isCardFilled);
    if (filledCards.length === 0) {
      Alert.alert('Nothing to save', 'Fill in at least one ingredient.');
      return;
    }

    const existingNames = new Set(ingredients.map((i) => i.name.trim().toLowerCase()));
    const nextErrors = {};
    const itemsToSave = [];

    for (const card of filledCards) {
      const err = validateCard(card, existingNames);
      if (err) {
        nextErrors[card.draftId] = { [err.field]: err.message };
      } else {
        itemsToSave.push(parseCard(card));
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setCardErrors(nextErrors);
      Alert.alert('Check your ingredients', 'Fix the highlighted fields before saving.');
      return;
    }

    if (!canAddIngredient(ingredients.length + itemsToSave.length - 1)) {
      setShowPaywall(true);
      return;
    }

    setSaving(true);
    const saved = [];
    const failures = [];

    for (const item of itemsToSave) {
      const { data: savedItem, error } = await addIngredient(item);
      if (error) failures.push({ name: item.name, error });
      else saved.push(savedItem);
    }

    setSaving(false);

    if (saved.length === 0) {
      Alert.alert('Save failed', failures[0]?.error ?? 'Could not save ingredients. Please try again.');
      return;
    }

    if (failures.length > 0) {
      Alert.alert(
        'Partially saved',
        `${saved.length} saved. ${failures.length} failed: ${failures.map((f) => f.name).join(', ')}`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/ingredients') }],
      );
      return;
    }

    router.replace('/(tabs)/ingredients');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Add ingredients</Text>
          <Text style={styles.headerSub}>Fill in each card, tap + for more</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardFormLayout
        scrollRef={scrollRef}
        contentContainerStyle={styles.scroll}
        footer={(
          <View style={styles.stickyFooter}>
            <Button
              title={
                saving
                  ? 'Saving…'
                  : filledCount > 1
                    ? `Save ${filledCount} ingredients`
                    : 'Save ingredient'
              }
              onPress={saveAll}
              loading={saving}
              size="lg"
            />
          </View>
        )}
      >
          {cards.map((card, index) => (
            <IngredientDraftCard
              key={card.draftId}
              card={card}
              index={index}
              symbol={symbol}
              canRemove={cards.length > 1}
              errors={cardErrors[card.draftId]}
              onChange={(field, value) => updateCard(card.draftId, field, value)}
              onRemove={() => removeCard(card.draftId)}
              onOpenUnitPicker={() => setUnitPickerDraftId(card.draftId)}
            />
          ))}

          <TouchableOpacity style={styles.addCardBtn} onPress={addCard} activeOpacity={0.7}>
            <View style={styles.addCardIcon}>
              <Ionicons name="add" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.addCardText}>Add another ingredient</Text>
          </TouchableOpacity>
      </KeyboardFormLayout>

      <Modal
        visible={unitPickerDraftId != null}
        onClose={() => setUnitPickerDraftId(null)}
        title="Select unit"
      >
          {unitGroups.map((group) => (
            <View key={group.label} style={styles.unitGroup}>
              <Text style={styles.unitGroupLabel}>{group.label}</Text>
              <View style={styles.unitChipRow}>
                {group.units.map((u) => {
                  const active = unitPickerCard?.purchase_unit === u.value;
                  return (
                    <TouchableOpacity
                      key={u.value}
                      style={[styles.unitChip, active && styles.unitChipActive]}
                      onPress={() => {
                        if (unitPickerDraftId) updateCard(unitPickerDraftId, 'purchase_unit', u.value);
                        setUnitPickerDraftId(null);
                      }}
                    >
                      <Text style={[styles.unitChipText, active && styles.unitChipTextActive]}>{u.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
      </Modal>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} reason="ingredient" />
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
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: SPACING.sm },
  headerTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  ingredientCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  cardTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.3 },
  cardRemoveBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },

  fieldGroup: { marginBottom: SPACING.sm },
  fieldLabel: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs },
  purchaseLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: 0.6,
    marginBottom: SPACING.sm,
  },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    minHeight: 44,
  },
  inputBoxError: { borderColor: COLORS.error },
  textInput: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    minHeight: 44,
  },
  multilineBox: { alignItems: 'flex-start' },
  multilineInput: { minHeight: 56, paddingTop: SPACING.sm, textAlignVertical: 'top' },

  purchaseRow: { flexDirection: 'row', alignItems: 'flex-start' },
  purchaseCol: {},
  purchaseColGap: { width: SPACING.xs },
  colLabel: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs },
  priceBox: { flexDirection: 'row', alignItems: 'center' },
  currencyPrefix: { paddingLeft: SPACING.sm, fontSize: FONT_SIZE.base, color: COLORS.text, fontWeight: '500' },
  unitBox: { justifyContent: 'space-between', paddingHorizontal: SPACING.sm },
  unitText: { fontSize: FONT_SIZE.sm, color: COLORS.text, fontWeight: '500', flex: 1 },
  costHint: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: SPACING.sm, fontStyle: 'italic' },

  optionalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  optionalToggleText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  optionalFields: { marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },

  addCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
    backgroundColor: '#F0FDF4',
    minHeight: 56,
  },
  addCardIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addCardText: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.primary },

  stickyFooter: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  errorText: { fontSize: FONT_SIZE.xs, color: COLORS.error, marginTop: SPACING.xs },

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
});
