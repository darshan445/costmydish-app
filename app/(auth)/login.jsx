import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { KeyboardFormLayout } from '../../components/ui/KeyboardFormLayout';
import useAuthStore from '../../stores/authStore';
import { COLORS, FONT_SIZE, SPACING } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuthStore();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async ({ email, password }) => {
    try {
      await signIn({ email, password });
    } catch (error) {
      Alert.alert('Sign In Failed', error.message ?? 'Invalid email or password.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardFormLayout contentContainerStyle={styles.scroll}>
          <View style={styles.form}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <Controller
            control={control}
            name="email"
            rules={{
              required: 'Email is required',
              pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
            }}
            render={({ field: { onChange, value } }) => (
              <Input label="Email" value={value} onChangeText={onChange} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />
            )}
          />

          <Controller
            control={control}
            name="password"
            rules={{ required: 'Password is required' }}
            render={({ field: { onChange, value } }) => (
              <Input label="Password" value={value} onChangeText={onChange} placeholder="Your password" secureTextEntry showPasswordToggle autoCapitalize="none" error={errors.password?.message} />
            )}
          />

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotBtn}>
            <Text style={styles.link}>Forgot password?</Text>
          </TouchableOpacity>

          <Button title="Sign In" onPress={handleSubmit(onSubmit)} loading={isSubmitting} size="lg" style={styles.submitBtn} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Text style={styles.link} onPress={() => router.replace('/(auth)/signup')}>Sign up</Text>
          </View>
          </View>
      </KeyboardFormLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
    justifyContent: 'center',
  },
  form: { width: '100%' },
  header: { marginBottom: SPACING.xl, alignItems: 'center' },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs, textAlign: 'center' },
  subtitle: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary, textAlign: 'center' },
  submitBtn: { marginTop: SPACING.sm },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: SPACING.sm, minHeight: 44, justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.lg },
  footerText: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  link: { fontSize: FONT_SIZE.base, color: COLORS.primary, fontWeight: '600' },
});
