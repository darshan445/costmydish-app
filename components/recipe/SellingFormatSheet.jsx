import { useEffect, useMemo, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '../ui/Modal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Button } from '../ui/Button';
import { calculateSellingFormatMetrics, parsePositiveNumber, roundPriceUp } from '../../lib/calculations';
import { FOOD_COST_COPY as C } from '../../constants/copy';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';
import { formatCurrency, formatFoodCostPercent } from '../../utils/format';
import { formatSellingFormatName, labelPerSellingUnit } from '../../utils/sellingFormat';

/**
 * Add / edit one way a dish is sold: unit, how many the dish makes, price.
 * The price starts at the suggested price until the owner types one.
 */
export function SellingFormatSheet({
  visible,
  mode,
  initialFormat,
  unitOptions,
  totalRecipeCost,
  hasAnyCost,
  targetFoodCostPercent,
  dishName,
  currencySymbol,
  saving = false,
  onSubmit,
  onDelete,
  onClose,
}) {
  const [unit, setUnit] = useState('piece');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [priceTouched, setPriceTouched] = useState(false);
  const [qtyError, setQtyError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const initialPrice = parsePositiveNumber(initialFormat?.selling_price);
    setUnit(initialFormat?.selling_unit_name ?? unitOptions[0]?.value ?? 'piece');
    setQty(String(initialFormat?.unit_quantity ?? '1'));
    setPrice(initialPrice != null ? String(initialPrice) : '');
    setPriceTouched(initialPrice != null);
    setQtyError('');
    setPriceError('');
    setShowUnitPicker(false);
    setConfirmRemove(false);
  }, [visible, initialFormat]);

  const unitLabel = unitOptions.find((u) => u.value === unit)?.label
    ?? (unit === initialFormat?.selling_unit_name ? initialFormat?.selling_unit_label : null)
    ?? unit;

  const suggestedPrice = useMemo(() => {
    if (!hasAnyCost) return null;
    return roundPriceUp(calculateSellingFormatMetrics({
      totalRecipeCost,
      unitQuantity: parsePositiveNumber(qty) ?? 1,
      sellingPrice: null,
      targetFoodCostPercent,
    }).recommendedPrice);
  }, [hasAnyCost, totalRecipeCost, qty, targetFoodCostPercent]);

  const shownPrice = priceTouched ? price : (suggestedPrice != null ? suggestedPrice.toFixed(2) : '');

  const preview = useMemo(() => {
    const p = parsePositiveNumber(shownPrice);
    if (p == null || !hasAnyCost) return null;
    return calculateSellingFormatMetrics({
      totalRecipeCost,
      unitQuantity: parsePositiveNumber(qty) ?? 1,
      sellingPrice: p,
      targetFoodCostPercent,
    });
  }, [shownPrice, hasAnyCost, totalRecipeCost, qty, targetFoodCostPercent]);

  const handleSubmit = () => {
    const q = parsePositiveNumber(qty);
    const p = parsePositiveNumber(shownPrice);
    setQtyError(q == null ? C.sellingFormat.qtyRequired : '');
    setPriceError(p == null ? C.sellingFormat.priceRequired : '');
    if (q == null || p == null) return;
    onSubmit({ selling_unit_name: unit, unit_quantity: q, selling_price: p });
  };

  const title = mode === 'add' ? C.action.addAnotherWayToSell : C.action.editWayToSell;

  const savedUnitLabel = unitOptions.find((u) => u.value === initialFormat?.selling_unit_name)?.label
    ?? initialFormat?.selling_unit_label
    ?? initialFormat?.selling_unit_name
    ?? '';
  const removeName = formatSellingFormatName(
    savedUnitLabel,
    parsePositiveNumber(initialFormat?.unit_quantity) ?? 1,
    '',
  );

  const handleConfirmRemove = async () => {
    await onDelete?.();
    setConfirmRemove(false);
  };

  if (showUnitPicker) {
    return (
      <Modal
        visible={visible}
        onClose={onClose}
        onBack={() => setShowUnitPicker(false)}
        title={C.sellingFormat.unitLabel}
        scrollable
      >
        {unitOptions.map((u) => (
          <TouchableOpacity
            key={u.value}
            style={styles.listRow}
            onPress={() => { setUnit(u.value); setShowUnitPicker(false); }}
          >
            <Text style={styles.listRowText}>{u.label}</Text>
            {unit === u.value ? <Ionicons name="checkmark" size={18} color={COLORS.primary} /> : null}
          </TouchableOpacity>
        ))}
      </Modal>
    );
  }

  return (
      <Modal
        visible={visible}
        onClose={onClose}
        title={title}
        scrollable
        keyboardLift
        overlay={confirmRemove ? (
          <ConfirmModal
            inline
            visible
            onClose={() => setConfirmRemove(false)}
            onConfirm={handleConfirmRemove}
            title={C.sellingFormat.removeTitle}
            message={C.sellingFormat.removeMessage(removeName)}
            confirmLabel={C.sellingFormat.removeConfirm}
            cancelLabel={C.sellingFormat.removeCancel}
            variant="danger"
            loading={saving}
          />
        ) : null}
        onOverlayClose={() => { if (!saving) setConfirmRemove(false); }}
        footer={(
          <>
            <Button
              title={mode === 'add' ? C.action.addSellingPrice : C.action.save}
              onPress={handleSubmit}
              loading={saving}
              size="lg"
            />
            {mode === 'edit' && onDelete ? (
              <TouchableOpacity
                onPress={() => { Keyboard.dismiss(); setConfirmRemove(true); }}
                disabled={saving}
                style={styles.deleteBtn}
                accessibilityRole="button"
              >
                <Text style={styles.deleteText}>{C.sellingFormat.remove}</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      >
        <Text style={styles.hint}>{C.sellingFormat.hint}</Text>

        <Text style={styles.label}>{C.sellingFormat.unitLabel}</Text>
        <TouchableOpacity
          style={[styles.inputBox, styles.unitBox, { marginBottom: SPACING.md }]}
          onPress={() => { Keyboard.dismiss(); setShowUnitPicker(true); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={C.sellingFormat.unitLabel}
        >
          <Text style={styles.unitText} numberOfLines={1}>{unitLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.label}>{C.sellingFormat.qtyLabel}</Text>
        <View style={[styles.inputBox, qtyError ? styles.inputBoxError : null]}>
          <TextInput
            style={styles.textInput}
            value={qty}
            onChangeText={(v) => { setQty(v); setQtyError(''); }}
            keyboardType="decimal-pad"
            placeholder="1"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>
        {qtyError ? <Text style={styles.errorText}>{qtyError}</Text> : null}
        <View style={{ height: SPACING.md }} />

        <Text style={styles.label}>{labelPerSellingUnit('Price per', unitLabel)}</Text>
        <View style={[styles.inputBox, priceError ? styles.inputBoxError : null]}>
          <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
          <TextInput
            style={styles.textInput}
            value={shownPrice}
            onChangeText={(v) => { setPrice(v); setPriceTouched(true); setPriceError(''); }}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={COLORS.textTertiary}
          />
        </View>
        {priceError ? <Text style={styles.errorText}>{priceError}</Text> : null}

        {suggestedPrice != null ? (
          <TouchableOpacity
            style={styles.suggestChip}
            onPress={() => { setPrice(suggestedPrice.toFixed(2)); setPriceTouched(true); setPriceError(''); }}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Ionicons name="sparkles-outline" size={14} color={COLORS.primary} />
            <Text style={styles.suggestChipText}>
              {C.wizard.useSuggested(formatCurrency(suggestedPrice, currencySymbol))}
            </Text>
          </TouchableOpacity>
        ) : null}

        {preview ? (
          <View style={styles.preview}>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>{C.wizard.foodCost}</Text>
              <Text style={[
                styles.previewValue,
                preview.marginStatus === 'good' && { color: COLORS.marginGood },
                preview.marginStatus === 'warning' && { color: COLORS.marginWarning },
                preview.marginStatus === 'danger' && { color: COLORS.marginDanger },
              ]}>
                {formatFoodCostPercent(preview.foodCostPercent)}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>{labelPerSellingUnit('Profit per', unitLabel)}</Text>
              <Text style={styles.previewValue}>{formatCurrency(preview.profit, currencySymbol)}</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.formatName} numberOfLines={2}>
          {formatSellingFormatName(unitLabel, qty, dishName)}
        </Text>
      </Modal>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 16, marginBottom: SPACING.md },
  label: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
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
  unitBox: { justifyContent: 'space-between', paddingHorizontal: SPACING.sm },
  unitText: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.text, fontWeight: '500', marginRight: SPACING.xs },
  textInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    minHeight: 44,
  },
  currencyPrefix: { paddingLeft: SPACING.md, fontSize: FONT_SIZE.base, color: COLORS.text, fontWeight: '500' },
  errorText: { fontSize: FONT_SIZE.xs, color: COLORS.error, marginTop: SPACING.xs },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    minHeight: 44,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    backgroundColor: '#F0FDF4',
  },
  suggestChipText: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.primary },
  preview: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    gap: SPACING.xs,
  },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  previewValue: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: COLORS.text },
  formatName: { marginTop: SPACING.md, fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  deleteBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  deleteText: { fontSize: FONT_SIZE.sm, color: COLORS.error, fontWeight: '600' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listRowText: { fontSize: FONT_SIZE.base, color: COLORS.text, fontWeight: '500' },
});
