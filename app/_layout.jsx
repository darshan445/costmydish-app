import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bootLog } from '../lib/debugBoot';
import { supabase } from '../lib/supabase';
import {
  initRevenueCat,
  resetRevenueCatUser,
  attachCustomerInfoListener,
  syncRevenueCatForUser,
} from '../lib/revenuecat';
import useAuthStore from '../stores/authStore';
import useSettingsStore from '../stores/settingsStore';
import useRecipeStore from '../stores/recipeStore';
import useSubscriptionStore from '../stores/subscriptionStore';
import { COLORS } from '../constants/theme';

let authSideEffectsFlight = null;
let authSideEffectsUserId = null;

/** Deferred session work — must not run inside onAuthStateChange (Supabase auth lock). */
async function runAuthSessionSideEffects(event, session) {
  bootLog('auth:sideEffects:start', { event });

  if (!session?.user) {
    authSideEffectsFlight = null;
    authSideEffectsUserId = null;
    useSubscriptionStore.getState().clearRcEntitlement();
    if (event === 'SIGNED_OUT') {
      bootLog('auth:event:revenuecat:logout:start');
      await resetRevenueCatUser();
      bootLog('auth:event:revenuecat:logout:done');
    }
    bootLog('auth:sideEffects:done', { event });
    return;
  }

  const userId = session.user.id;
  if (authSideEffectsFlight && authSideEffectsUserId === userId) {
    bootLog('auth:sideEffects:skipped', { event, reason: 'in-flight' });
    return authSideEffectsFlight;
  }

  authSideEffectsUserId = userId;
  authSideEffectsFlight = (async () => {
    try {
      const { fetchProfile } = useAuthStore.getState();
      const { fetchSettings, applyDeviceLocaleSettings } = useSettingsStore.getState();
      const { fetchSellingUnits } = useRecipeStore.getState();

      await fetchProfile(userId);
      if (event === 'SIGNED_UP') {
        await applyDeviceLocaleSettings(userId);
      }
      await fetchSettings(userId);
      fetchSellingUnits();

      const entitled = await syncRevenueCatForUser(userId);
      useSubscriptionStore.getState().setRcEntitled(entitled);
    } catch (error) {
      bootLog('auth:sideEffects:error', { event, message: error?.message });
    } finally {
      authSideEffectsFlight = null;
      bootLog('auth:sideEffects:done', { event });
    }
  })();

  return authSideEffectsFlight;
}

function AuthBootstrap() {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading, initialized, initialize, setUser } = useAuthStore();

  useEffect(() => {
    bootLog('bootstrap:effect:start');
    initRevenueCat();
    attachCustomerInfoListener((entitled) => {
      bootLog('revenuecat:entitlementUpdate', { entitled });
      useSubscriptionStore.getState().setRcEntitled(entitled);
    });

    bootLog('auth:onAuthStateChange:subscribe');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      bootLog('auth:event', { event, hasUser: !!session?.user });
      if (session?.user) {
        setUser(session.user);
      } else {
        useAuthStore.setState({ user: null, profile: null });
      }
      setTimeout(() => {
        runAuthSessionSideEffects(event, session);
      }, 0);
    });

    initialize().then(() => {
      bootLog('bootstrap:effect:done');
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized || loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    bootLog('bootstrap:navigate', {
      hasUser: !!user,
      inAuthGroup,
      segment: segments[0] ?? null,
    });

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
