import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import useAuthStore from '../../stores/authStore';
import { COLORS, FONT_SIZE, SPACING } from '../../constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuthStore();
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }) => {
    setSubmitError('');
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (error) {
      setSubmitError(error.message ?? 'Could not send reset email. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Forgot password?</Text>
            <Text style={styles.subtitle}>
              Enter your email and we will send you a link to reset your password on costmydish.com.
            </Text>
          </View>

          {sent ? (
            <View style={styles.successBox}>
              <Ionicons name="mail-outline" size={28} color={COLORS.primary} style={{ marginBottom: SPACING.sm }} />
              <Text style={styles.successText}>Check your email for a link to reset your password</Text>
            </View>
          ) : (
            <>
              <Controller
                control={control}
                name="email"
                rules={{
                  required: 'Email is required',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
                }}
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Email"
                    value={value}
                    onChangeText={(v) => { onChange(v); setSubmitError(''); }}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={errors.email?.message}
                  />
                )}
              />

              {submitError ? <Text style={styles.errorBanner}>{submitError}</Text> : null}

              <Button
                title="Send reset link"
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                size="lg"
                style={styles.submitBtn}
              />
            </>
          )}

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.backToLogin}>
            <Text style={styles.link}>Back to sign in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl },
  header: { marginBottom: SPACING.xl },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary, lineHeight: 22 },
  submitBtn: { marginTop: SPACING.sm },
  errorBanner: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.error,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  successText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.primaryDark,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  backToLogin: { alignItems: 'center', marginTop: SPACING.lg },
  link: { fontSize: FONT_SIZE.base, color: COLORS.primary, fontWeight: '600' },
});
