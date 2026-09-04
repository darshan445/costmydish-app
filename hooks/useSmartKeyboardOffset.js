import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Platform } from 'react-native';
import { useKeyboardInset } from './useKeyboardInset';

const SAFETY_PX = 16;
const OFFSET_EPSILON = 2;

/**
 * Measures the focused field vs the keyboard and returns how much a bottom sheet
 * should lift — only what's needed, on any screen size.
 *
 * Measure math adds back the current lift so remounts don't oscillate
 * (lift → field moves up → "no overlap" → drop → flicker).
 */
export function useSmartKeyboardOffset({ enabled = true, footerReserve = 88 } = {}) {
  const keyboardInset = useKeyboardInset();
  const keyboardInsetRef = useRef(keyboardInset);
  keyboardInsetRef.current = keyboardInset;

  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const offsetRef = useRef(0);
  const focusedRef = useRef(null);
  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const applyOffset = useCallback((next) => {
    const clamped = Math.max(0, next);
    if (Math.abs(clamped - offsetRef.current) < OFFSET_EPSILON) return;
    offsetRef.current = clamped;
    setKeyboardOffset(clamped);
  }, []);

  const reevaluate = useCallback(() => {
    if (!enabled) {
      applyOffset(0);
      return;
    }

    const node = focusedRef.current;
    const kb = keyboardInsetRef.current;
    const currentLift = offsetRef.current;

    if (!node || typeof node.measureInWindow !== 'function') {
      applyOffset(0);
      return;
    }

    if (kb <= 0) return;

    node.measureInWindow((_x, y, _w, h) => {
      if (y == null || h == null) return;
      if (focusedRef.current !== node) return;

      // Field is already shifted up by currentLift — restore "unlifted" position
      const fieldBottomUnlifted = y + h + currentLift;
      const windowH = Dimensions.get('window').height;
      const keyboardTop = windowH - kb;
      const overlap = fieldBottomUnlifted - (keyboardTop - footerReserve - SAFETY_PX);
      const next = overlap <= 0 ? 0 : Math.min(kb, Math.ceil(overlap));
      applyOffset(next);
    });
  }, [enabled, footerReserve, applyOffset]);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      focusedRef.current = null;
      applyOffset(0);
      return undefined;
    }
    if (keyboardInset <= 0) {
      applyOffset(0);
      return undefined;
    }
    reevaluate();
    return undefined;
  }, [enabled, keyboardInset, reevaluate, clearTimer, applyOffset]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const bindField = useCallback((ref) => ({
    onFocus: () => {
      focusedRef.current = ref?.current ?? null;
      clearTimer();
      // One short delay so layout/focus settle — avoid multi-hit remesures (flicker)
      const delay = Platform.OS === 'ios' ? 32 : 64;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        reevaluate();
      }, delay);
    },
  }), [clearTimer, reevaluate]);

  const clearFocus = useCallback(() => {
    clearTimer();
    focusedRef.current = null;
    applyOffset(0);
  }, [clearTimer, applyOffset]);

  return {
    keyboardOffset: enabled ? keyboardOffset : null,
    bindField,
    clearFocus,
    reevaluate,
  };
}
