import { useEffect } from 'react';
import { usePathname, useSegments } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import {
  identifyUser,
  registerPostHogClient,
  resetAnalytics,
  setUserTraits,
  trackScreen,
  unregisterPostHogClient,
} from '../../lib/analytics';
import useAuthStore from '../../stores/authStore';
import useIngredientStore from '../../stores/ingredientStore';
import useRecipeStore from '../../stores/recipeStore';
import useSettingsStore from '../../stores/settingsStore';

/** Wires PostHog client + screen views + user identity. */
export function AnalyticsBridge() {
  const posthog = usePostHog();
  const pathname = usePathname();
  const segments = useSegments();

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const settings = useSettingsStore((s) => s.settings);
  const ingredients = useIngredientStore((s) => s.ingredients);
  const recipes = useRecipeStore((s) => s.recipes);

  useEffect(() => {
    if (!posthog) return undefined;
    registerPostHogClient(posthog);
    return () => unregisterPostHogClient();
  }, [posthog]);

  useEffect(() => {
    if (!user?.id) {
      resetAnalytics();
      return;
    }

    identifyUser(user.id, {
      email: user.email ?? undefined,
      subscription_tier: profile?.subscription_tier ?? 'free',
      onboarding_completed: profile?.onboarding_completed ?? false,
    });
  }, [user?.id, user?.email, profile?.subscription_tier, profile?.onboarding_completed]);

  useEffect(() => {
    if (!user?.id) return;

    setUserTraits(user.id, {
      ingredient_count: ingredients.length,
      recipe_count: recipes.length,
      default_food_cost_percent: settings?.default_food_cost_percent ?? null,
      currency: settings?.currency ?? null,
      unit_system: settings?.unit_system ?? null,
      subscription_tier: profile?.subscription_tier ?? 'free',
    });
  }, [
    user?.id,
    ingredients.length,
    recipes.length,
    settings?.default_food_cost_percent,
    settings?.currency,
    settings?.unit_system,
    profile?.subscription_tier,
  ]);

  useEffect(() => {
    if (!pathname) return;
    trackScreen(pathname, {
      route_segments: segments.join('/'),
    });
  }, [pathname, segments.join('/')]);

  return null;
}
