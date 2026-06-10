import { useCallback, useMemo } from 'react';
import {
  getCompatibleUnitsForIngredient,
  getDefaultPurchaseUnit,
  getUnitGroupsForSystem,
  normalizeUnitSystem,
} from '../constants/units';
import useSettingsStore from '../stores/settingsStore';

export function useUnitSystem() {
  const unitSystem = useSettingsStore((s) => normalizeUnitSystem(s.settings.unit_system));

  const unitGroups = useMemo(() => getUnitGroupsForSystem(unitSystem), [unitSystem]);
  const defaultPurchaseUnit = useMemo(() => getDefaultPurchaseUnit(unitSystem), [unitSystem]);

  const getCompatibleUnits = useCallback(
    (purchaseUnit) => getCompatibleUnitsForIngredient(purchaseUnit, unitSystem),
    [unitSystem],
  );

  return {
    unitSystem,
    unitGroups,
    defaultPurchaseUnit,
    getCompatibleUnits,
  };
}
