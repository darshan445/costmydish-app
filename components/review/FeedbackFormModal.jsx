import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { COLORS, FONT_SIZE, SPACING } from '../../constants/theme';

/**
 * Shared feedback form for Yes / Not really / Settings.
 *
 * @param {'yes' | 'declined' | 'settings'} variant
 */
export function FeedbackFormModal({
  visible,
  onClose,
  onSubmit,
  onSkip,
  variant = 'settings',
  loading = false,
}) {
  const [message, setMessage] = useState('');
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setMessage('');
      setDontAskAgain(false);
      setError('');
    }
  }, [visible]);

  const isYes = variant === 'yes';
  const isDeclined = variant === 'declined';

  const title = isYes
    ? 'What would help next?'
    : isDeclined
      ? 'What can we improve?'
      : 'Send feedback';

  const placeholder = isYes
    ? 'A feature you’d use, or anything that would help your kitchen…'
    : isDeclined
      ? 'What felt off, or what should we fix?'
      : 'Questions, bugs, ideas — we read every message.';

  const hint = isYes
    ? 'Optional — Skip is fine. Then you may see a rating prompt from Google or Apple.'
    : isDeclined
      ? 'Thanks for telling us — this helps more than a low rating.'
      : 'We reply when we can. No email app needed.';

  const showDontAsk = isDeclined;
  const showSkip = isYes;

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed && !isYes) {
      setError('Please write a short message.');
      return;
    }
    if (!trimmed && isYes) {
      onSkip?.();
      return;
    }
    setError('');
    await onSubmit?.({ message: trimmed, dontAskAgain: showDontAsk && dontAskAgain });
  };

  return (
    <Modal
      visible={visible}
      onClose={loading ? () => {} : onClose}
      title={title}
      footer={(
        <View style={styles.footer}>
          <Button
            title={isYes && !message.trim() ? 'Skip' : 'Send'}
            onPress={handleSend}
            loading={loading}
            disabled={loading}
          />
          {showSkip && message.trim() ? (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={onSkip}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : null}
          {!isYes ? (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={onClose}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={styles.skipText}>Cancel</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    >
      <Text style={styles.hint}>{hint}</Text>
      <Input
        label="Your message"
        value={message}
        onChangeText={(t) => {
          setMessage(t);
          if (error) setError('');
        }}
        placeholder={placeholder}
        multiline
        numberOfLines={5}
        error={error}
        editable={!loading}
        inputStyle={styles.textarea}
      />
      {showDontAsk ? (
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setDontAskAgain((v) => !v)}
          disabled={loading}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: dontAskAgain }}
        >
          <Ionicons
            name={dontAskAgain ? 'checkbox' : 'square-outline'}
            size={22}
            color={dontAskAgain ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={styles.checkLabel}>Don’t ask again</Text>
        </TouchableOpacity>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    minHeight: 44,
  },
  checkLabel: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  footer: {
    gap: SPACING.xs,
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  skipText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
