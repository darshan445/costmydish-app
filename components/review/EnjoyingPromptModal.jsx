import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';

/**
 * Soft ask before native store review — Yes / Not really / Maybe later.
 */
export function EnjoyingPromptModal({
  visible,
  onYes,
  onNotReally,
  onMaybeLater,
  onSendFeedback,
}) {
  if (!visible) return null;

  return (
    <RNModal
      visible
      transparent
      animationType="fade"
      onRequestClose={onMaybeLater}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdropPressable}
          onPress={onMaybeLater}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <View style={styles.backdrop} />
        </Pressable>

        <View style={styles.sheet}>
          <Text style={styles.title}>Enjoying CostMyDish?</Text>
          <Text style={styles.body}>
            Your feedback helps us improve food costing for kitchen businesses.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onYes}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Yes, I like it</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onNotReally}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Not really</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={onMaybeLater}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.ghostText}>Maybe later</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            You can rate or send feedback anytime in Settings.
          </Text>

          {onSendFeedback ? (
            <TouchableOpacity
              onPress={onSendFeedback}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="link"
            >
              <Text style={styles.link}>Send feedback</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    zIndex: 1,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  body: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  primaryText: {
    color: '#fff',
    fontSize: FONT_SIZE.base,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  secondaryText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.base,
    fontWeight: '600',
  },
  ghostBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  ghostText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.base,
    fontWeight: '500',
  },
  hint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: SPACING.sm,
  },
  link: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
