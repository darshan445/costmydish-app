import { useEffect, useRef } from 'react';
import {
  Animated,
  Keyboard,
  Modal as RNModal,
  PanResponder,
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

const DISMISS_OFFSET = 640;

export function Modal({ visible, onClose, title, children, style, scrollable = true }) {
  const translateY = useRef(new Animated.Value(DISMISS_OFFSET)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scrollOffset = useRef(0);
  const keyboardInset = useKeyboardInset();
  const scrollableRef = useRef(scrollable);

  scrollableRef.current = scrollable;

  const onCloseRef = useRef(onClose);
  const dismissRef = useRef(null);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const dismiss = (animated = true) => {
    Keyboard.dismiss();
    if (!animated) {
      translateY.setValue(DISMISS_OFFSET);
      backdropOpacity.setValue(0);
      onCloseRef.current();
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: DISMISS_OFFSET,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onCloseRef.current();
      }
    });
  };

  dismissRef.current = dismiss;

  const snapBack = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 14,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePanRelease = (dy, vy) => {
    if (dy > 80 || vy > 0.75) {
      dismissRef.current?.(true);
    } else {
      snapBack();
    }
  };

  const dragPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy, dx }) => (
        Math.abs(dy) > 4 && Math.abs(dy) > Math.abs(dx)
      ),
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) {
          translateY.setValue(dy);
          backdropOpacity.setValue(Math.max(0, 1 - dy / 280));
        }
      },
      onPanResponderRelease: (_, { dy, vy }) => handlePanRelease(dy, vy),
      onPanResponderTerminate: (_, { dy, vy }) => handlePanRelease(dy, vy),
    }),
  ).current;

  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy, dx }) => (
        scrollableRef.current
        && scrollOffset.current <= 0
        && dy > 6
        && Math.abs(dy) > Math.abs(dx)
      ),
      onMoveShouldSetPanResponderCapture: (_, { dy, dx }) => (
        scrollableRef.current
        && scrollOffset.current <= 0
        && dy > 12
        && Math.abs(dy) > Math.abs(dx) * 1.5
      ),
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) {
          translateY.setValue(dy);
          backdropOpacity.setValue(Math.max(0, 1 - dy / 280));
        }
      },
      onPanResponderRelease: (_, { dy, vy }) => handlePanRelease(dy, vy),
      onPanResponderTerminate: (_, { dy, vy }) => handlePanRelease(dy, vy),
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      scrollOffset.current = 0;
      translateY.setValue(DISMISS_OFFSET);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 68,
          friction: 12,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      translateY.setValue(DISMISS_OFFSET);
      backdropOpacity.setValue(0);
      Keyboard.dismiss();
    }
  }, [visible, translateY, backdropOpacity]);

  const handleScroll = (event) => {
    scrollOffset.current = event.nativeEvent.contentOffset.y;
  };

  if (!visible) return null;

  return (
    <RNModal visible transparent animationType="none" onRequestClose={() => dismissRef.current?.(true)}>
      <View style={styles.container} pointerEvents="box-none">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => dismissRef.current?.(true)}
          accessibilityRole="button"
          accessibilityLabel="Close modal"
        >
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
            pointerEvents="none"
          />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY }], marginBottom: keyboardInset },
            style,
          ]}
          {...(scrollable ? sheetPanResponder.panHandlers : null)}
        >
          <View style={styles.dragHandleWrap} {...dragPanResponder.panHandlers}>
            <View style={styles.dragHandle} />
          </View>

          {title ? (
            <View style={styles.header} {...dragPanResponder.panHandlers}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity
                onPress={() => dismissRef.current?.(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {scrollable ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              showsVerticalScrollIndicator={false}
              bounces
              nestedScrollEnabled
              scrollEventThrottle={16}
              onScroll={handleScroll}
              contentContainerStyle={keyboardInset > 0 ? { paddingBottom: SPACING.sm } : undefined}
            >
              {children}
            </ScrollView>
          ) : (
            <View>{children}</View>
          )}
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
    maxHeight: '90%',
  },
  dragHandleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
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
  },
});
