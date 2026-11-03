import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Keyboard,
  Modal as RNModal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Reanimated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import {
  KeyboardAvoidingView,
  KeyboardEvents,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNativeModalVisible } from '../../lib/nativeModal';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/theme';

/**
 * Bottom sheet modal — backdrop and sheet are non-overlapping siblings (reliable Android taps).
 *
 * Keyboard: the whole sheet is wrapped in react-native-keyboard-controller's
 * KeyboardAvoidingView (behavior="padding"), so it rises with the keyboard on both
 * platforms, including inside a native Modal and with Android edge-to-edge.
 * The sheet shrinks to the space above the keyboard and the body scrolls.
 * Bottom padding clears the home indicator / nav bar while the keyboard is closed and
 * drops to a normal gap while it is open (the keyboard already clears the system bars).
 *
 * Never open a second modal on top of this one (iOS won't show it). Instead:
 * - onBack: show an inner view (e.g. a unit list) in this sheet with a back arrow
 * - overlay: show a dialog (e.g. <ConfirmModal inline />) in place of this sheet;
 *   the sheet (and its parent's state) comes back when the overlay is cleared
 */
export function Modal({
  visible: visibleProp,
  onClose,
  title,
  children,
  footer,
  style,
  onBack,
  overlay,
  onOverlayClose,
  scrollable = true,
  /** When false, the sheet does not rise with the keyboard. */
  keyboardLift = true,
}) {
  const visible = useNativeModalVisible(visibleProp);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  const scrollRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const scrollViewportRef = useRef(0);
  const insets = useSafeAreaInsets();
  const { progress: keyboardProgress } = useReanimatedKeyboardAnimation();
  // Closed: clear the home indicator / nav bar (never less than 32). Open: a normal 16 gap.
  const closedPaddingBottom = SPACING.md + Math.max(insets.bottom, SPACING.md);
  const sheetPaddingStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardLift
      ? interpolate(keyboardProgress.value, [0, 1], [closedPaddingBottom, SPACING.md])
      : closedPaddingBottom,
  }), [keyboardLift, closedPaddingBottom]);

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

  /**
   * Keep the focused input visible inside the sheet once the keyboard is open.
   * Android's native ScrollView already does this when it is resized; iOS does not,
   * so we measure the focused TextInput against the scroll content and scroll if needed.
   */
  const scrollFocusedInputIntoView = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    const scrollNode = scrollRef.current;
    if (!input || !scrollNode) return;
    const content = scrollNode.getInnerViewRef?.() ?? scrollNode.getInnerViewNode?.();
    if (!content) return;
    try {
      input.measureLayout(
        content,
        (_x, y, _w, h) => {
          const viewport = scrollViewportRef.current;
          const offset = scrollOffsetRef.current;
          if (!viewport) return;
          const top = y - SPACING.md;
          const bottom = y + h + SPACING.md;
          if (bottom > offset + viewport) {
            scrollNode.scrollTo({ y: bottom - viewport, animated: true });
          } else if (top < offset) {
            scrollNode.scrollTo({ y: Math.max(0, top), animated: true });
          }
        },
        () => {},
      );
    } catch (_) { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!visible || !scrollable || !keyboardLift) return undefined;
    const sub = KeyboardEvents.addListener('keyboardDidShow', scrollFocusedInputIntoView);
    return () => sub.remove();
  }, [visible, scrollable, keyboardLift, scrollFocusedInputIntoView]);

  const handleClose = () => {
    Keyboard.dismiss();
    onCloseRef.current();
  };

  const handleHardwareBack = () => {
    if (overlay) {
      onOverlayClose?.();
      return;
    }
    if (onBack) {
      onBack();
      return;
    }
    handleClose();
  };

  if (!visible) return null;

  return (
    <RNModal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleHardwareBack}
      statusBarTranslucent
    >
      {overlay ?? (
      <KeyboardAvoidingView
        behavior="padding"
        enabled={keyboardLift}
        automaticOffset
        style={styles.container}
      >
        <Pressable
          style={styles.backdropPressable}
          onPress={onBack ?? handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close modal"
        >
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
            pointerEvents="none"
          />
        </Pressable>

        <Reanimated.View style={[styles.sheet, sheetPaddingStyle, style]}>
          {title ? (
            <View style={styles.header}>
              {onBack ? (
                <TouchableOpacity
                  onPress={onBack}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.6}
                  style={styles.backBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                >
                  <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                </TouchableOpacity>
              ) : null}
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
              {onBack ? null : (
                <TouchableOpacity
                  onPress={handleClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.6}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Text style={styles.closeBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {scrollable ? (
            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
              showsVerticalScrollIndicator={false}
              bounces
              nestedScrollEnabled
              scrollEventThrottle={16}
              onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
              onLayout={(e) => { scrollViewportRef.current = e.nativeEvent.layout.height; }}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.body}>{children}</View>
          )}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Reanimated.View>
      </KeyboardAvoidingView>
      )}
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
    maxHeight: '90%',
    flexShrink: 1,
    zIndex: 2,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  backBtn: {
    marginRight: SPACING.sm,
    marginLeft: -SPACING.xs,
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
    flexShrink: 1,
  },
  footer: {
    paddingTop: SPACING.md,
    gap: SPACING.xs,
  },
});
