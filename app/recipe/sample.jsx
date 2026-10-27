import { useMemo } from 'react';
import RecipeDetailScreen from './[id]';
import useSettingsStore from '../../stores/settingsStore';
import { buildSampleDish } from '../../constants/sampleDish';

export default function SampleDishScreen() {
  const currency = useSettingsStore((s) => s.settings.currency);
  const { recipe, currencySymbol } = useMemo(() => buildSampleDish(currency), [currency]);
  return <RecipeDetailScreen sampleRecipe={recipe} sampleCurrencySymbol={currencySymbol} />;
}
