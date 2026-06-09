import { StyleSheet, Text, View } from 'react-native';
import { Modal } from './Modal';
import { Button } from './Button';
import { COLORS, FONT_SIZE, SPACING } from '../../constants/theme';

export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal visible={visible} onClose={onClose}>
      <View style={styles.iconRow}>
        <View style={[styles.iconCircle, variant === 'danger' ? styles.iconDanger : styles.iconPrimary]}>
          <Text style={styles.iconEmoji}>{variant === 'danger' ? '⚠️' : '❓'}</Text>
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.actions}>
        <Button
          title={confirmLabel}
          onPress={onConfirm}
          variant={variant === 'danger' ? 'danger' : 'primary'}
          size="lg"
          loading={loading}
          style={styles.confirmBtn}
        />
        <Button
          title={cancelLabel}
          onPress={onClose}
          variant="ghost"
          size="lg"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  iconRow: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDanger: { backgroundColor: '#FEE2E2' },
  iconPrimary: { backgroundColor: '#D1FAE5' },
  iconEmoji: { fontSize: 28 },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  actions: {
    gap: SPACING.xs,
  },
  confirmBtn: {
    marginBottom: SPACING.xs,
  },
});
