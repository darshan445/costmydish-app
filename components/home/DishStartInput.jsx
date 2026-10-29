import { useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { parsePositiveNumber } from '../../lib/calculations';
import { track, AnalyticsEvents } from '../../lib/analytics';
import { FOOD_COST_COPY as C } from '../../constants/copy';
import { COLORS, FONT_SIZE, RADIUS, SHADOW, SPACING } from '../../constants/theme';

/**
 * "What are you making?" — dish name, how many it makes and the unit, then open the editor.
 * onStart({ name, yieldQty?, unit, method: 'typed' | 'chip', chip? })
 */
export function DishStartInput({ starters, unitOptions, onStart }) {
  const [name, setName] = useState('');
  const [yieldQty, setYieldQty] = useState('');
  const [unit, setUnit] = useState('serving');
  const [pickedChip, setPickedChip] = useState(null);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const tracked = useRef({ name: false, yield: false });

  const trimmed = name.replace(/\s+/g, ' ').trim();
  const yieldInvalid = yieldQty.trim() !== '' && parsePositiveNumber(yieldQty) == null;
  const unitLabel = unitOptions.find((u) => u.value === unit)?.label ?? unit;

  const changeName = (value) => {
    setName(value);
    if (!tracked.current.name && value.trim()) {
      tracked.current.name = true;
      track(AnalyticsEvents.HOME_START_NAME_TYPED);
    }
  };

  const changeYield = (value) => {
    setYieldQty(value);
    if (!tracked.current.yield && value.trim()) {
      tracked.current.yield = true;
      track(AnalyticsEvents.HOME_START_YIELD_ENTERED);
    }
  };

  const pickStarter = (starter) => {
    track(AnalyticsEvents.HOME_START_CHIP_TAPPED, { chip: starter.key });
    setName(starter.label);
    if (unitOptions.some((u) => u.value === starter.unit)) setUnit(starter.unit);
    setPickedChip(starter.key);
  };

  const submit = () => {
    if (!trimmed || yieldInvalid) return;
    onStart({
      name: trimmed,
      yieldQty: yieldQty.trim() || null,
      unit,
      method: pickedChip && trimmed === starters.find((s) => s.key === pickedChip)?.label ? 'chip' : 'typed',
      chip: pickedChip,
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{C.home.startLabel}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={changeName}
        placeholder={C.home.startPlaceholder}
        placeholderTextColor={COLORS.textTertiary}
        autoCapitalize="words"
        returnKeyType="next"
        accessibilityLabel={C.home.startLabel}
      />

      <Text style={styles.orPick}>{C.home.orPick}</Text>
      <FlatList
        horizontal
        data={starters}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => {
          const active = pickedChip === item.key && trimmed === item.label;
          return (
            <TouchableOpacity
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => pickStarter(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{`${item.emoji} ${item.label}`}</Text>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.yieldRow}>
        <View style={styles.yieldCol}>
          <Text style={styles.fieldLabel}>{C.wizard.yieldLabel}</Text>
          <TextInput
            style={[styles.input, yieldInvalid && styles.inputError]}
            value={yieldQty}
            onChangeText={changeYield}
            placeholder={C.wizard.yieldPlaceholder}
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="decimal-pad"
            accessibilityLabel={`${C.wizard.yieldLabel}. ${C.wizard.yieldHelper}`}
          />
        </View>
        <View style={styles.yieldCol}>
          <Text style={styles.fieldLabel}>{C.wizard.yieldUnitLabel}</Text>
          <TouchableOpacity
            style={[styles.input, styles.unitBox]}
            onPress={() => setShowUnitPicker(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${C.wizard.yieldUnitLabel}: ${unitLabel}`}
          >
            <Text style={styles.unitText} numberOfLines={1}>{unitLabel}</Text>
            <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.helper, yieldInvalid && styles.helperError]}>
        {yieldInvalid ? C.home.yieldInvalid : C.wizard.yieldHelper}
      </Text>

      <Button
        title={C.home.nextAddIngredients}
        onPress={submit}
        disabled={!trimmed || yieldInvalid}
        size="lg"
        style={styles.submit}
      />

      <Modal
        visible={showUnitPicker}
        onClose={() => setShowUnitPicker(false)}
        title={C.wizard.yieldUnitLabel}
        scrollable
      >
        <FlatList
          data={unitOptions}
          keyExtractor={(item) => item.value}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listRow}
              onPress={() => {
                if (item.value !== unit) track(AnalyticsEvents.HOME_START_UNIT_CHANGED, { unit: item.value });
                setUnit(item.value);
                setShowUnitPicker(false);
              }}
            >
              <Text style={styles.listRowText}>{item.label}</Text>
              {unit === item.value ? <Ionicons name="checkmark" size={18} color={COLORS.primary} /> : null}
            </TouchableOpacity>
          )}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOW.sm,
  },
  label: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  fieldLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  input: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  inputError: { borderColor: COLORS.error },
  orPick: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.sm },
  chips: { gap: SPACING.sm },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5EE' },
  chipText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text },
  chipTextActive: { color: COLORS.primary },
  yieldRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  yieldCol: { flex: 1 },
  unitBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  unitText: { flex: 1, fontSize: FONT_SIZE.base, color: COLORS.text, marginRight: SPACING.xs },
  helper: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: SPACING.xs },
  helperError: { color: COLORS.error },
  submit: { marginTop: SPACING.md },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listRowText: { fontSize: FONT_SIZE.base, color: COLORS.text, fontWeight: '500' },
});
