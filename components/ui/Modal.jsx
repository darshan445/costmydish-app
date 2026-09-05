import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';

const KEYBOARD_LIFT_MS = Platform.OS === 'ios' ? 250 : 200;

/**
 * Bottom sheet modal — backdrop and sheet are non-overlapping siblings (reliable Android taps).
 *
 * Keyboard: lift the whole sheet with marginBottom (= keyboard height) so the form
 * pushes up above the keyboard (same on iOS and Android).
 * Pass keyboardOffset={0} only when you intentionally want no lift.
 */
export function Modal({
  visible,
  onClose,
  title,
  children,
  footer,
  style,
  scrollable = true,
  /** When false, sheet does not rise with the keyboard. Ignored if keyboardOffset is set. */
  keyboardLift = true,
  /**
   * Exact sheet lift in px. When set (including 0), overrides keyboardLift.
   * Omit to lift by full keyboard height when keyboardLift is true.
   */
  keyboardOffset = null,
}) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetLift = useRef(new Animated.Value(0)).current;
  const trackKeyboard = visible && (keyboardOffset != null || keyboardLift);
  const keyboardInset = useKeyboardInset({ enabled: trackKeyboard, poll: trackKeyboard });
  const onCloseRef = useRef(onClose);

  const sheetKeyboardInset = keyboardOffset != null
    ? keyboardOffset
    : (keyboardLift ? keyboardInset : 0);

  const adjustScrollInsets = keyboardOffset == null && keyboardLift && Platform.OS === 'ios'
    && sheetKeyboardInset <= 0;

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    Animated.timing(sheetLift, {
      toValue: sheetKeyboardInset,
      duration: KEYBOARD_LIFT_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [sheetKeyboardInset, sheetLift]);

  useEffect(() => {
    if (visible) {
      backdropOpacity.setValue(0);
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      backdropOpacity.setValue(0);
      sheetLift.setValue(0);
      Keyboard.dismiss();
    }
  }, [visible, backdropOpacity, sheetLift]);

  const handleClose = () => {
    Keyboard.dismiss();
    onCloseRef.current();
  };

  if (!visible) return null;

  return (
    <RNModal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Pressable
          style={styles.backdropPressable}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close modal"
        >
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
            pointerEvents="none"
          />
        </Pressable>

        <Animated.View style={[styles.sheet, { marginBottom: sheetLift }, style]}>
          {title ? (
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {scrollable ? (
            <ScrollView
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets={adjustScrollInsets}
              showsVerticalScrollIndicator={false}
              bounces
              nestedScrollEnabled
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.body}>{children}</View>
          )}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  container: {
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
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
    maxHeight: '90%',
    zIndex: 2,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  closeBtn: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    padding: SPACING.xs,
  },
  body: {
    flexGrow: 0,
  },
  footer: {
    paddingTop: SPACING.md,
    gap: SPACING.xs,
  },
});
