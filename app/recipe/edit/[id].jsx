import { useLocalSearchParams } from 'expo-router';
import CreateRecipeScreen from '../create';

/**
 * Edit uses the same stepped food-cost wizard as create, with the dish prefilled.
 * Optional `step` query (1–3) opens that wizard step directly.
 */
export default function EditRecipeScreen() {
  const { id, step } = useLocalSearchParams();
  const recipeId = typeof id === 'string' ? id : id?.[0];
  const stepRaw = typeof step === 'string' ? step : step?.[0];
  const parsed = parseInt(stepRaw, 10);
  const initialStep = parsed >= 1 && parsed <= 3 ? parsed : 1;
  return <CreateRecipeScreen recipeId={recipeId} initialStep={initialStep} />;
}
