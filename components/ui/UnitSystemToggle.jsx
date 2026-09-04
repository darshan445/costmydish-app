import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UNIT_SYSTEMS } from '../../constants/units';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';

/**
 * Compact Metric / Imperial switch for purchase-unit pickers.
 * Does not change the user's saved settings — only which unit list is shown.
 */
export function UnitSystemToggle({ value, onChange, style }) {
  return (
    <View style={[styles.wrap, style]}>
      {UNIT_SYSTEMS.map((system) => {
        const active = value === system.value;
        return (
          <TouchableOpacity
            key={system.value}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => {
              if (!active) onChange(system.value);
            }}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${system.label} units`}
          >
            <Text style={[styles.optionText, active && styles.optionTextActive]}>
              {system.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING.md,
    gap: 3,
  },
  option: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.xs,
  },
  optionActive: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  optionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  optionTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
