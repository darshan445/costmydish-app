import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import useIngredientStore from '../../stores/ingredientStore';
import useSettingsStore from '../../stores/settingsStore';
import { COLORS, FONT_SIZE, RADIUS, SPACING, SHADOW } from '../../constants/theme';

const UNIT_GROUPS = [
  { label: 'WEIGHT', units: [{ value: 'kg', label: 'kg' }, { value: 'g', label: 'g' }, { value: 'lb', label: 'lb' }, { value: 'oz', label: 'oz' }] },
  { label: 'VOLUME', units: [{ value: 'l', label: 'L' }, { value: 'ml', label: 'ml' }, { value: 'fl_oz', label: 'fl oz' }, { value: 'cup', label: 'cup' }, { value: 'tbsp', label: 'tbsp' }, { value: 'tsp', label: 'tsp' }] },
  { label: 'COUNT', units: [{ value: 'piece', label: 'piece' }, { value: 'each', label: 'each' }] },
];

function computeCostHint(price, qty, unit, symbol) {
  const q = parseFloat(qty) || 1;
  const p = parseFloat(price);
  const displayPrice = p > 0 ? p : 120;
  const prefix = p > 0 ? '' : 'e.g. ';
  const unitDisplay = unit === 'fl_oz' ? 'fl oz' : unit;
  return `${prefix}Bought ${q} ${unitDisplay} for ${symbol}${displayPrice}`;
}

export default function CreateIngredientScreen() {
  const router = useRouter();
  const { addIngredient } = useIngredientStore();
  const getCurrencySymbol = useSettingsStore((s) => s.getCurrencySymbol);
  const symbol = getCurrencySymbol();

  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      name: '',
      purchase_price: '',
      purchase_quantity: '1',
      purchase_unit: 'kg',
      waste_percent: '0',
      notes: '',
    },
  });

  const [watchPrice, watchQty, watchUnit] = watch(['purchase_price', 'purchase_quantity', 'purchase_unit']);

  const costHint = useMemo(
    () => computeCostHint(watchPrice, watchQty, watchUnit, symbol),
    [watchPrice, watchQty, watchUnit, symbol]
  );

  const onSubmit = async (data) => {
    const { error } = await addIngredient({
      name: data.name,
      category_id: null,
      purchase_price: parseFloat(data.purchase_price),
      purchase_quantity: parseFloat(data.purchase_quantity),
      purchase_unit: data.purchase_unit,
      waste_percent: parseFloat(data.waste_percent) || 0,
      notes: data.notes || null,
      is_archived: false,
    });
    if (error) { Alert.alert('Error', error); return; }
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add ingredient</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

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
                      <Text style={styles.unitText}>{value}</Text>
                      <Ionicons name="chevron-down" size={12} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )} />
            </View>

            {/* Dynamic cost hint */}
            <Text style={styles.costHint}>{costHint}</Text>
          </View>

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

        </ScrollView>

        <View style={styles.stickyFooter}>
          <Button title="Save ingredient" onPress={handleSubmit(onSubmit)} loading={isSubmitting} size="lg" />
        </View>
      </KeyboardAvoidingView>

      {/* Unit Picker Modal */}
      <Modal visible={showUnitPicker} onClose={() => setShowUnitPicker(false)} title="Select unit">
        <ScrollView showsVerticalScrollIndicator={false}>
          {UNIT_GROUPS.map((group) => (
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
        </ScrollView>
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
  headerTitle: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },

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

  costHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.sm,
  },

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
});
