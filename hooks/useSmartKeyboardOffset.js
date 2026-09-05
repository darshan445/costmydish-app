import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Platform } from 'react-native';
import { useKeyboardInset } from './useKeyboardInset';

const SAFETY_PX = 20;
const OFFSET_EPSILON = 2;

/**
 * Measured sheet lift for focused inputs. Falls back to full keyboard height when
 * measure isn't ready — never returns a "stuck at 0 while keyboard is open" state
 * for a focused field.
 */
export function useSmartKeyboardOffset({ enabled = true, footerReserve = 96 } = {}) {
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

  const reevaluate = useCallback((attempt = 0) => {
    if (!enabled) {
      applyOffset(0);
      return;
    }

    const kb = keyboardInsetRef.current;
    if (kb <= 0) {
      applyOffset(0);
      return;
    }

    const node = focusedRef.current;
    // Keyboard open + focused field: prefer full lift until measure succeeds
    if (!node || typeof node.measureInWindow !== 'function') {
      applyOffset(kb);
      return;
    }

    const currentLift = offsetRef.current;
    node.measureInWindow((_x, y, _w, h) => {
      if (focusedRef.current !== node) return;

      if (y == null || h == null || (h === 0 && attempt < 4)) {
        applyOffset(kb);
        clearTimer();
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          reevaluate(attempt + 1);
        }, Platform.OS === 'android' ? 90 : 40);
        return;
      }

      const fieldBottomUnlifted = y + h + currentLift;
      const windowH = Dimensions.get('window').height;
      const keyboardTop = windowH - kb;
      const overlap = fieldBottomUnlifted - (keyboardTop - footerReserve - SAFETY_PX);
      const next = overlap <= 0 ? kb * 0.35 : Math.min(kb, Math.ceil(overlap));
      // Even when measure says "no overlap", keep a floor on Android Modal (pan mode lies)
      const floor = Platform.OS === 'android' ? Math.ceil(kb * 0.45) : 0;
      applyOffset(Math.max(next, floor));
    });
  }, [enabled, footerReserve, applyOffset, clearTimer]);

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
      const kb = keyboardInsetRef.current;
      if (kb > 0) applyOffset(kb);
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        reevaluate();
      }, Platform.OS === 'android' ? 100 : 40);
    },
  }), [clearTimer, reevaluate, applyOffset]);

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
