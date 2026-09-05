import { useCallback, useEffect, useRef, useState } from 'react';
import { EnjoyingPromptModal } from './EnjoyingPromptModal';
import { FeedbackFormModal } from './FeedbackFormModal';
import {
  countNonSampleRecipes,
  markSoftAskShownThisSession,
  recordSoftOutcome,
  requestNativeStoreReview,
  resetReviewSessionForUser,
  setNeverAskAgain,
  shouldShowSoftAsk,
  SOFT_ASK_MIN_DISHES,
} from '../../lib/storeReview';
import { submitAppFeedback } from '../../lib/feedback';
import { track, AnalyticsEvents } from '../../lib/analytics';
import { showAppAlert } from '../../lib/appAlert';
import useAuthStore from '../../stores/authStore';

const SOFT_DELAY_MS = 2000;

/**
 * Orchestrates soft Enjoying prompt → feedback form → native store review
 * on the dish result screen after a successful save.
 */
export function ReviewPromptController({
  justSaved,
  nonSampleCount: nonSampleCountHint = 0,
  hasOnTargetMargin = false,
  ready = true,
}) {
  const userId = useAuthStore((s) => s.user?.id);
  const [showEnjoying, setShowEnjoying] = useState(false);
  /** @type {[null | 'yes' | 'declined', function]} */
  const [feedbackVariant, setFeedbackVariant] = useState(null);
  /** @type {[null | 'yes_prompt' | 'declined_prompt' | 'send_feedback_link', function]} */
  const [feedbackSource, setFeedbackSource] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    resetReviewSessionForUser(userId);
  }, [userId]);

  useEffect(() => {
    if (!ready || !justSaved || !userId || startedRef.current) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      // Prefer live DB count — Zustand list is often stale right after save / account switch
      let nonSampleCount = nonSampleCountHint;
      try {
        const liveCount = await countNonSampleRecipes(userId);
        if (liveCount > 0) nonSampleCount = Math.max(nonSampleCount, liveCount);
      } catch {
        // keep hint
      }

      if (cancelled) return;

      const eligible = await shouldShowSoftAsk({
        userId,
        justSaved: true,
        nonSampleCount,
        hasOnTargetMargin,
      });

      if (cancelled || !eligible) {
        if (__DEV__) {
          console.log('[review-prompt] not eligible', {
            nonSampleCount,
            min: SOFT_ASK_MIN_DISHES,
            hasOnTargetMargin,
          });
        }
        return;
      }

      startedRef.current = true;
      markSoftAskShownThisSession();
      setShowEnjoying(true);
      track(AnalyticsEvents.REVIEW_SOFT_SHOWN, {
        non_sample_count: nonSampleCount,
        on_target: hasOnTargetMargin,
      });
    }, SOFT_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, justSaved, nonSampleCountHint, hasOnTargetMargin, userId]);

  const finishNative = useCallback(async () => {
    setFeedbackVariant(null);
    setFeedbackSource(null);
    const requested = await requestNativeStoreReview(userId);
    track(AnalyticsEvents.REVIEW_NATIVE_REQUESTED, { requested: !!requested });
  }, [userId]);

  const openFeedback = useCallback((variant, source) => {
    setFeedbackVariant(variant);
    setFeedbackSource(source);
  }, []);

  const handleYes = useCallback(async () => {
    setShowEnjoying(false);
    await recordSoftOutcome(userId, 'yes');
    track(AnalyticsEvents.REVIEW_SOFT_YES);
    openFeedback('yes', 'yes_prompt');
  }, [openFeedback, userId]);

  const handleNotReally = useCallback(async () => {
    setShowEnjoying(false);
    await recordSoftOutcome(userId, 'declined');
    track(AnalyticsEvents.REVIEW_SOFT_DECLINED);
    openFeedback('declined', 'declined_prompt');
  }, [openFeedback, userId]);

  const handleMaybeLater = useCallback(async () => {
    setShowEnjoying(false);
    await recordSoftOutcome(userId, 'later');
    track(AnalyticsEvents.REVIEW_SOFT_LATER);
  }, [userId]);

  const handleSendFeedbackLink = useCallback(async () => {
    setShowEnjoying(false);
    await recordSoftOutcome(userId, 'declined');
    track(AnalyticsEvents.REVIEW_SOFT_DECLINED, { via: 'send_feedback_link' });
    openFeedback('declined', 'send_feedback_link');
  }, [openFeedback, userId]);

  const handleFeedbackSubmit = useCallback(async ({ message, dontAskAgain }) => {
    setSubmitting(true);
    try {
      const source = feedbackSource ?? 'declined_prompt';

      const { error } = await submitAppFeedback({
        userId,
        message,
        source,
        dontAskAgain: !!dontAskAgain,
      });

      if (error) {
        showAppAlert({ title: 'Could not send', message: error, variant: 'error' });
        return;
      }

      track(AnalyticsEvents.REVIEW_FEEDBACK_SUBMITTED, {
        source,
        dont_ask_again: !!dontAskAgain,
      });

      if (dontAskAgain) {
        await setNeverAskAgain(userId);
      }

      if (feedbackVariant === 'yes') {
        await finishNative();
      } else {
        setFeedbackVariant(null);
        setFeedbackSource(null);
        showAppAlert({
          title: 'Thanks',
          message: 'We got your feedback.',
          variant: 'success',
        });
      }
    } finally {
      setSubmitting(false);
    }
  }, [feedbackVariant, feedbackSource, userId, finishNative]);

  const handleFeedbackSkip = useCallback(async () => {
    track(AnalyticsEvents.REVIEW_FEEDBACK_SKIPPED, { source: 'yes_prompt' });
    await finishNative();
  }, [finishNative]);

  const handleFeedbackClose = useCallback(() => {
    if (feedbackVariant === 'yes') {
      finishNative();
      return;
    }
    setFeedbackVariant(null);
    setFeedbackSource(null);
  }, [feedbackVariant, finishNative]);

  return (
    <>
      <EnjoyingPromptModal
        visible={showEnjoying}
        onYes={handleYes}
        onNotReally={handleNotReally}
        onMaybeLater={handleMaybeLater}
        onSendFeedback={handleSendFeedbackLink}
      />
      <FeedbackFormModal
        visible={feedbackVariant != null}
        variant={feedbackVariant === 'yes' ? 'yes' : 'declined'}
        loading={submitting}
        onClose={handleFeedbackClose}
        onSubmit={handleFeedbackSubmit}
        onSkip={handleFeedbackSkip}
      />
    </>
  );
}
