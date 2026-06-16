import {
  ActivityIndicator,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';

const VARIANTS = {
  success: {
    icon: 'checkmark-circle',
    iconColor: COLORS.success,
    iconBg: '#D1FAE5',
    buttonBg: COLORS.primary,
  },
  info: {
    icon: 'information-circle',
    iconColor: COLORS.primary,
    iconBg: '#D1FAE5',
    buttonBg: COLORS.primary,
  },
  warning: {
    icon: 'alert-circle',
    iconColor: COLORS.warning,
    iconBg: '#FEF3C7',
    buttonBg: COLORS.warning,
  },
  error: {
    icon: 'close-circle',
    iconColor: COLORS.error,
    iconBg: '#FEE2E2',
    buttonBg: COLORS.error,
  },
};

/**
 * Themed info/success/warning dialog — matches app design (not system Alert).
 */
export function AppAlertModal({
  visible,
  onClose,
  title,
  message,
  variant = 'info',
  primaryLabel = 'OK',
  onPrimary,
  secondaryLabel,
  onSecondary,
  loading = false,
}) {
  if (!visible) return null;

  const v = VARIANTS[variant] ?? VARIANTS.info;

  const handlePrimary = () => {
    onPrimary?.();
    onClose();
  };

  const handleSecondary = () => {
    onSecondary?.();
    onClose();
  };

  return (
    <RNModal
      visible
      transparent
      animationType="fade"
      onRequestClose={loading ? undefined : onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdropPressable}
          onPress={loading ? undefined : onClose}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Close dialog"
        >
          <View style={styles.backdrop} />
        </Pressable>

        <View style={styles.sheet}>
          <View style={styles.iconRow}>
            <View style={[styles.iconCircle, { backgroundColor: v.iconBg }]}>
              <Ionicons name={v.icon} size={32} color={v.iconColor} />
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: v.buttonBg }]}
              onPress={handlePrimary}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryText}>{primaryLabel}</Text>
              )}
            </TouchableOpacity>

            {secondaryLabel ? (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleSecondary}
                disabled={loading}
                activeOpacity={0.6}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryText}>{secondaryLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    flex: 1,
    width: '100%',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
    zIndex: 2,
    elevation: 24,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  actions: {
    gap: SPACING.xs,
  },
  primaryBtn: {
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md - 2,
  },
  primaryText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md - 2,
  },
  secondaryText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
