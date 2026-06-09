import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { COLORS, FONT_SIZE, SPACING } from '../../constants/theme';
import { formatCurrency } from '../../utils/format';
import { UNIT_LABELS } from '../../constants/units';

export const IngredientCard = memo(function IngredientCard({ ingredient, currencySymbol, onPress, onDelete }) {
  const unit = UNIT_LABELS[ingredient.purchase_unit] ?? ingredient.purchase_unit;

  return (
    <Card padding="none" style={styles.card}>
      <TouchableOpacity style={styles.main} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{ingredient.name}</Text>
          <Text style={styles.price}>
            {formatCurrency(ingredient.purchase_price, currencySymbol)} per {ingredient.purchase_quantity} {unit}
          </Text>
          {ingredient.waste_percent > 0 && (
            <Text style={styles.waste}>{ingredient.waste_percent}% waste</Text>
          )}
        </View>
        <View style={styles.unitBadge}>
          <Text style={styles.unitText}>{unit}</Text>
        </View>
      </TouchableOpacity>

      {onDelete && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      )}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.sm, flexDirection: 'row', alignItems: 'center' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: SPACING.md, paddingRight: SPACING.sm },
  info: { flex: 1 },
  name: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  price: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  waste: { fontSize: FONT_SIZE.xs, color: COLORS.warning, marginTop: 2 },
  unitBadge: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  unitText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textSecondary },
  deleteBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
});
