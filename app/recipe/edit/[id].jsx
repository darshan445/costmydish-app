import { useLocalSearchParams } from 'expo-router';
import CreateRecipeScreen from '../create';

/** Edit uses the same single-screen dish editor as create, with the dish prefilled. */
export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams();
  const recipeId = typeof id === 'string' ? id : id?.[0];
  return <CreateRecipeScreen recipeId={recipeId} />;
}
