import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, SPACING } from '../../constants/theme';
import { formatCurrency, formatQuantity } from '../../utils/format';
import { formatUnitLabel } from '../../constants/units';

export const IngredientRow = memo(function IngredientRow({ item, cost, error, currencySymbol, onRemove }) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.ingredient?.name ?? item.name}</Text>
        <Text style={styles.quantity}>
          {formatQuantity(item.quantity)} {formatUnitLabel(item.unit)}
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <View style={styles.right}>
        <Text style={[styles.cost, error && styles.costError]}>
          {error ? '—' : formatCurrency(cost, currencySymbol)}
        </Text>
        {onRemove && (
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.removeBtn}>
            <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  info: { flex: 1 },
  name: { fontSize: FONT_SIZE.base, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  quantity: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  error: { fontSize: FONT_SIZE.xs, color: COLORS.error, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cost: { fontSize: FONT_SIZE.base, fontWeight: '700', color: COLORS.primary },
  costError: { color: COLORS.error },
  removeBtn: { padding: 2 },
});
