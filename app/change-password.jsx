import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import useAuthStore from '../stores/authStore';
import { COLORS, FONT_SIZE, SPACING } from '../constants/theme';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { changePassword } = useAuthStore();
  const [submitError, setSubmitError] = useState('');

  const { control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');

  const onSubmit = async ({ currentPassword, password: newPassword }) => {
    setSubmitError('');
    try {
      await changePassword({ currentPassword, newPassword });
      Alert.alert('Password updated', 'Your password has been changed successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      setSubmitError(error.message ?? 'Could not update password. Please try again.');
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
            <Text style={styles.title}>Change password</Text>
            <Text style={styles.subtitle}>Enter your current password, then choose a new one.</Text>
          </View>

          <Controller
            control={control}
            name="currentPassword"
            rules={{ required: 'Current password is required' }}
            render={({ field: { onChange, value } }) => (
              <Input
                label="Current password"
                value={value}
                onChangeText={(v) => { onChange(v); setSubmitError(''); }}
                placeholder="Your current password"
                secureTextEntry
                autoCapitalize="none"
                error={errors.currentPassword?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            rules={{
              required: 'New password is required',
              minLength: { value: 6, message: 'At least 6 characters' },
            }}
            render={({ field: { onChange, value } }) => (
              <Input
                label="New password"
                value={value}
                onChangeText={(v) => { onChange(v); setSubmitError(''); }}
                placeholder="Min. 6 characters"
                secureTextEntry
                autoCapitalize="none"
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            rules={{
              required: 'Confirm your new password',
              validate: (v) => v === password || 'Passwords do not match',
            }}
            render={({ field: { onChange, value } }) => (
              <Input
                label="Confirm new password"
                value={value}
                onChangeText={(v) => { onChange(v); setSubmitError(''); }}
                placeholder="Repeat new password"
                secureTextEntry
                autoCapitalize="none"
                error={errors.confirmPassword?.message}
              />
            )}
          />

          {submitError ? <Text style={styles.errorBanner}>{submitError}</Text> : null}

          <Button
            title="Update password"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            size="lg"
            style={styles.submitBtn}
          />
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
});
