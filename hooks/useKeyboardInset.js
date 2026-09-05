import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, TextInput } from 'react-native';

function readKeyboardHeight(event) {
  const fromEvent = event?.endCoordinates?.height;
  if (typeof fromEvent === 'number' && fromEvent > 0) return fromEvent;
  try {
    const metrics = Keyboard.metrics();
    if (metrics?.height > 0) return metrics.height;
  } catch (_) {
    // ignore
  }
  return 0;
}

/** Rough height when Android Modal swallows keyboard height (common with pan mode). */
function fallbackKeyboardHeight() {
  const h = Dimensions.get('window').height;
  return Math.round(Math.min(Math.max(h * 0.38, 260), 360));
}

function hasFocusedTextInput() {
  try {
    return !!TextInput.State?.currentlyFocusedInput?.();
  } catch (_) {
    return false;
  }
}

/**
 * Tracks keyboard height for bottom-sheet lift.
 *
 * Android + RN Modal often fires show with height 0 — with `poll: true` we retry and
 * may use a short fallback. Hide always clears inset (even if the field stays focused),
 * so the sheet never leaves empty space after the keyboard closes.
 *
 * @param {{ enabled?: boolean, poll?: boolean }} [options]
 */
export function useKeyboardInset({ enabled = true, poll = false } = {}) {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setInset(0);
      return undefined;
    }

    let retryTimers = [];
    let pollTimer = null;

    const clearRetries = () => {
      retryTimers.forEach(clearTimeout);
      retryTimers = [];
    };

    const clearLift = () => {
      clearRetries();
      setInset(0);
    };

    const applyRealHeight = (height) => {
      if (height <= 0) return false;
      clearRetries();
      setInset(height);
      return true;
    };

    const scheduleRetries = (event) => {
      clearRetries();
      const delays = Platform.OS === 'android' ? [50, 120, 250, 400] : [32, 80];
      delays.forEach((ms, i) => {
        retryTimers.push(setTimeout(() => {
          const h = readKeyboardHeight(event);
          if (applyRealHeight(h)) return;
          // Last try: estimate only if a field is still focused (keyboard likely open)
          if (
            poll
            && Platform.OS === 'android'
            && i === delays.length - 1
            && hasFocusedTextInput()
          ) {
            setInset(fallbackKeyboardHeight());
          }
        }, ms));
      });
    };

    const applyShow = (event) => {
      const height = readKeyboardHeight(event);
      if (applyRealHeight(height)) return;
      scheduleRetries(event);
    };

    const applyHide = () => {
      // Always drop lift — Android numeric keyboard often dismisses while focus remains
      clearLift();
    };

    const pollTick = () => {
      // Only upgrade to real metrics; never keep/create lift from focus alone
      // (focus-without-keyboard was leaving empty space after dismiss)
      const h = readKeyboardHeight();
      if (h > 0) applyRealHeight(h);
    };

    const subs = Platform.OS === 'ios'
      ? [
          Keyboard.addListener('keyboardWillShow', applyShow),
          Keyboard.addListener('keyboardDidShow', applyShow),
          Keyboard.addListener('keyboardWillHide', applyHide),
          Keyboard.addListener('keyboardDidHide', applyHide),
        ]
      : [
          Keyboard.addListener('keyboardDidShow', applyShow),
          Keyboard.addListener('keyboardDidHide', applyHide),
        ];

    if (poll && Platform.OS === 'android') {
      pollTimer = setInterval(pollTick, 150);
    }

    return () => {
      clearRetries();
      if (pollTimer) clearInterval(pollTimer);
      subs.forEach((s) => s.remove());
    };
  }, [enabled, poll]);

  return enabled ? inset : 0;
}
