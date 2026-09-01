import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PaywallModal } from '../paywall/PaywallModal';
import { useCalculateFoodCost } from '../../hooks/useCalculateFoodCost';
import { FOOD_COST_COPY as C } from '../../constants/copy';
import { track, AnalyticsEvents } from '../../lib/analytics';
import { COLORS, FONT_SIZE, RADIUS, SPACING, SHADOW } from '../../constants/theme';

const TAB_CONFIG = {
  index: { label: C.nav.home, icon: 'home', iconOutline: 'home-outline' },
  recipes: { label: C.nav.dishes, icon: 'restaurant', iconOutline: 'restaurant-outline' },
  ingredients: { label: C.nav.library, icon: 'leaf', iconOutline: 'leaf-outline' },
  settings: { label: C.nav.settings, icon: 'settings', iconOutline: 'settings-outline' },
};

function TabItem({ route, descriptor, navigation, focused }) {
  const config = TAB_CONFIG[route.name] ?? {
    label: descriptor.options.title ?? route.name,
    icon: 'ellipse',
    iconOutline: 'ellipse-outline',
  };

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      track(AnalyticsEvents.TAB_VIEWED, { tab: route.name });
      navigation.navigate(route.name);
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={config.label}
      onPress={onPress}
      style={styles.tab}
      activeOpacity={0.7}
    >
      <Ionicons
        name={focused ? config.icon : config.iconOutline}
        size={22}
        color={focused ? COLORS.primary : COLORS.textTertiary}
      />
      <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
        {config.label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Custom tab bar: Home · Dishes · [Calculate FAB] · Library · Settings
 */
export function MainTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { startCalculate, showPaywall, closePaywall } = useCalculateFoodCost();
  const bottomPad = Math.max(insets.bottom, 8);

  const leftRoutes = state.routes.filter((r) => r.name === 'index' || r.name === 'recipes');
  const rightRoutes = state.routes.filter((r) => r.name === 'ingredients' || r.name === 'settings');

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPad }]}>
      <View style={styles.bar}>
        <View style={styles.side}>
          {leftRoutes.map((route) => {
            const index = state.routes.findIndex((r) => r.key === route.key);
            return (
              <TabItem
                key={route.key}
                route={route}
                descriptor={descriptors[route.key]}
                navigation={navigation}
                focused={state.index === index}
              />
            );
          })}
        </View>

        <View style={styles.fabSlot}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => startCalculate({ source: 'fab' })}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={C.action.calculateA11y}
          >
            <Ionicons name="calculator" size={26} color={COLORS.surface} />
          </TouchableOpacity>
          <Text style={styles.fabLabel} numberOfLines={1}>{C.action.fabLabel}</Text>
        </View>

        <View style={styles.side}>
          {rightRoutes.map((route) => {
            const index = state.routes.findIndex((r) => r.key === route.key);
            return (
              <TabItem
                key={route.key}
                route={route}
                descriptor={descriptors[route.key]}
                navigation={navigation}
                focused={state.index === index}
              />
            );
          })}
        </View>
      </View>

      <PaywallModal visible={showPaywall} onClose={closePaywall} reason="recipe" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 56,
    paddingTop: SPACING.xs,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    minHeight: 48,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  labelActive: {
    color: COLORS.primary,
  },
  fabSlot: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: Platform.OS === 'ios' ? 2 : 0,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    ...SHADOW.md,
  },
  fabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
});
