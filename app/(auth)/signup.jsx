import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SignupLegalNotice } from '../../components/ui/LegalLinks';
import { KeyboardFormLayout } from '../../components/ui/KeyboardFormLayout';
import useAuthStore from '../../stores/authStore';
import { COLORS, FONT_SIZE, SPACING } from '../../constants/theme';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuthStore();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const onSubmit = async ({ fullName, email, password }) => {
    try {
      await signUp({ email, password, fullName });
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Sign Up Failed', error.message ?? 'Something went wrong. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardFormLayout contentContainerStyle={styles.scroll}>
          <View style={styles.form}>
          <View style={styles.header}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Start costing your recipes for free</Text>
          </View>

          <Controller
            control={control}
            name="fullName"
            rules={{ required: 'Name is required' }}
            render={({ field: { onChange, value } }) => (
              <Input label="Your name" value={value} onChangeText={onChange} placeholder="Chef John" error={errors.fullName?.message} />
            )}
          />

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
            rules={{ required: 'Password is required', minLength: { value: 6, message: 'At least 6 characters' } }}
            render={({ field: { onChange, value } }) => (
              <Input label="Password" value={value} onChangeText={onChange} placeholder="Min. 6 characters" secureTextEntry showPasswordToggle autoCapitalize="none" error={errors.password?.message} />
            )}
          />

          <SignupLegalNotice />

          <Button title="Create Account" onPress={handleSubmit(onSubmit)} loading={isSubmitting} size="lg" style={styles.submitBtn} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Text style={styles.link} onPress={() => router.replace('/(auth)/login')}>Sign in</Text>
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
  submitBtn: { marginTop: SPACING.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.lg },
  footerText: { fontSize: FONT_SIZE.base, color: COLORS.textSecondary },
  link: { fontSize: FONT_SIZE.base, color: COLORS.primary, fontWeight: '600' },
});
