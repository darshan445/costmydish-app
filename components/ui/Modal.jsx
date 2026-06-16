import { useEffect, useRef } from 'react';
import {
  Animated,
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

/**
 * Bottom sheet modal — backdrop and sheet are non-overlapping siblings (reliable Android taps).
 * No PanResponder or sheet translate animation (those caused double-tap issues).
 */
export function Modal({
  visible,
  onClose,
  title,
  children,
  footer,
  style,
  scrollable = true,
}) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const keyboardInset = useKeyboardInset();
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

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
      Keyboard.dismiss();
    }
  }, [visible, backdropOpacity]);

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

        <View style={[styles.sheet, { marginBottom: keyboardInset }, style]}>
          {title ? (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
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
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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
        </View>
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
