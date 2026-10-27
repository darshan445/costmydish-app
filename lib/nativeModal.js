import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/**
 * iOS can only present one native modal at a time from the root screen: opening a
 * second sibling modal (or opening one while the previous is still fading out)
 * silently does nothing. Every app modal goes through useNativeModalVisible so a
 * newly opened modal waits for the previous one to finish closing, and
 * isNativeModalOpen lets callers fall back to the system alert, which iOS always
 * shows on top.
 *
 * Rule: never open a modal while another is visible — swap the content inside
 * the open sheet (Modal onBack / overlay) instead.
 */
const IOS_DISMISS_MS = 450;

let openCount = 0;
let lastDismissAt = 0;

function waitBeforePresentMs() {
  if (Platform.OS !== 'ios') return 0;
  return Math.max(0, IOS_DISMISS_MS - (Date.now() - lastDismissAt));
}

export function isNativeModalOpen() {
  return openCount > 0;
}

/**
 * Returns whether the native modal should actually be on screen right now.
 * Runs in an effect (not during render) so a modal closed in the same update has
 * already recorded its dismissal before this one decides when to present.
 */
export function useNativeModalVisible(visible) {
  const [ready, setReady] = useState(false);
  const presentedRef = useRef(false);

  useEffect(() => {
    if (!visible) return undefined;
    // Counted from the moment it's requested, so alerts raised while it waits also fall back
    openCount += 1;
    let timer = null;
    const present = () => {
      presentedRef.current = true;
      setReady(true);
    };
    const wait = waitBeforePresentMs();
    if (wait === 0) present();
    else timer = setTimeout(present, wait);

    return () => {
      if (timer) clearTimeout(timer);
      openCount -= 1;
      if (presentedRef.current) lastDismissAt = Date.now();
      presentedRef.current = false;
      setReady(false);
    };
  }, [visible]);

  return visible && ready;
}
