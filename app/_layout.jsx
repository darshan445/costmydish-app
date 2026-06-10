import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { initRevenueCat, identifyRevenueCatUser, resetRevenueCatUser, attachCustomerInfoListener } from '../lib/revenuecat';
import useAuthStore from '../stores/authStore';
import useSettingsStore from '../stores/settingsStore';
import useRecipeStore from '../stores/recipeStore';
import useSubscriptionStore from '../stores/subscriptionStore';
import { COLORS } from '../constants/theme';

function AuthBootstrap() {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading, initialized, initialize, setUser, fetchProfile } = useAuthStore();
  const { fetchSettings, applyDeviceLocaleSettings } = useSettingsStore();
  const { fetchSellingUnits } = useRecipeStore();

  useEffect(() => {
    initRevenueCat();
    attachCustomerInfoListener((entitled) => {
      useSubscriptionStore.getState().setRcEntitled(entitled);
    });
    (async () => {
      await initialize();
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        await identifyRevenueCatUser(userId);
        await useSubscriptionStore.getState().syncFromRevenueCat();
      }
    })();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
        if (event === 'SIGNED_UP') {
          await applyDeviceLocaleSettings(session.user.id);
        }
        await fetchSettings(session.user.id);
        fetchSellingUnits();
        await identifyRevenueCatUser(session.user.id);
        await useSubscriptionStore.getState().syncFromRevenueCat();
      } else {
        useAuthStore.setState({ user: null, profile: null });
        useSubscriptionStore.getState().clearRcEntitlement();
        if (event === 'SIGNED_OUT') {
          await resetRevenueCatUser();
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized || loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, initialized, loading, segments, router]);

  if (!initialized || loading) {
    return (
      <View style={styles.bootOverlay} pointerEvents="none">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="recipe/[id]" />
        <Stack.Screen name="recipe/create" />
        <Stack.Screen name="recipe/edit/[id]" />
        <Stack.Screen name="ingredient/create" />
        <Stack.Screen name="ingredient/edit/[id]" />
        <Stack.Screen name="ingredient/price-history/[id]" />
        <Stack.Screen name="change-password" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      </Stack>
      <AuthBootstrap />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bootOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    zIndex: 999,
  },
});
