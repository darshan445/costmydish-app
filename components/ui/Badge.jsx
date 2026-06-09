import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';

const VARIANTS = {
  good: { bg: '#D1FAE5', text: COLORS.success },
  warning: { bg: '#FEF3C7', text: COLORS.warning },
  danger: { bg: '#FEE2E2', text: COLORS.error },
  info: { bg: '#EFF6FF', text: '#3B82F6' },
  neutral: { bg: COLORS.surfaceAlt, text: COLORS.textSecondary },
  primary: { bg: '#D1FAE5', text: COLORS.primary },
};

export function Badge({ label, variant = 'neutral', style }) {
  const colors = VARIANTS[variant] ?? VARIANTS.neutral;

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs - 1,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
});
