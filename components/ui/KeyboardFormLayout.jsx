import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SPACING } from '../../constants/theme';

/**
 * Scrollable form layout that keeps the focused input visible when the keyboard opens.
 * Uses react-native-keyboard-controller's KeyboardAwareScrollView (same behaviour on
 * iOS and Android, including Android edge-to-edge). Footer stays pinned below the scroll
 * area (not lifted above the keyboard).
 */
export function KeyboardFormLayout({
  children,
  footer = null,
  scrollRef,
  contentContainerStyle,
  style,
  scrollProps = {},
}) {
  return (
    <View style={[{ flex: 1 }, style]}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={contentContainerStyle}
        bottomOffset={SPACING.lg}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        {...scrollProps}
      >
        {children}
      </KeyboardAwareScrollView>
      {footer}
    </View>
  );
}
