import { Platform, ScrollView, View } from 'react-native';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';

/**
 * Scrollable form layout that keeps inputs visible when the keyboard opens.
 * Scroll content gets extra bottom padding; footer stays pinned (not lifted above keyboard).
 * Pair with softwareKeyboardLayoutMode: "pan" in app.json so Android does not resize the window.
 */
export function KeyboardFormLayout({
  children,
  footer = null,
  scrollRef,
  contentContainerStyle,
  style,
  scrollProps = {},
}) {
  const keyboardInset = useKeyboardInset();

  return (
    <View style={[{ flex: 1 }, style]}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[
          contentContainerStyle,
          keyboardInset > 0 && { paddingBottom: keyboardInset },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={false}
        {...scrollProps}
      >
        {children}
      </ScrollView>
      {footer}
    </View>
  );
}
