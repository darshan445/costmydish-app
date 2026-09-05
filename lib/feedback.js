import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

/**
 * @typedef {'yes_prompt' | 'declined_prompt' | 'send_feedback_link' | 'settings'} FeedbackSource
 */

/**
 * Persist in-app feedback to Supabase.
 * @param {{
 *   userId: string,
 *   message: string,
 *   source: FeedbackSource,
 *   dontAskAgain?: boolean,
 * }} opts
 */
export async function submitAppFeedback({
  userId,
  message,
  source,
  dontAskAgain = false,
}) {
  const trimmed = (message ?? '').trim();
  if (!userId) {
    return { error: 'You must be signed in to send feedback.' };
  }
  if (!trimmed) {
    return { error: 'Please write a short message.' };
  }

  const appVersion =
    Constants.expoConfig?.version
    ?? Constants.nativeAppVersion
    ?? null;

  try {
    const { error } = await supabase.from('app_feedback').insert({
      user_id: userId,
      source,
      message: trimmed,
      dont_ask_again: !!dontAskAgain,
      platform: Platform.OS,
      app_version: appVersion,
    });

    if (error) {
      console.warn('submitAppFeedback failed:', error.message);
      return { error: 'Could not send feedback. Please try again.' };
    }

    return { error: null };
  } catch (e) {
    console.warn('submitAppFeedback exception:', e?.message);
    return { error: 'Could not send feedback. Please try again.' };
  }
}
