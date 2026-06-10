import { Redirect } from 'expo-router';
import useAuthStore from '../stores/authStore';

export default function Index() {
  const { user, initialized, loading } = useAuthStore();

  if (loading || !initialized) {
    return null;
  }

  return <Redirect href={user ? '/(tabs)' : '/(auth)/welcome'} />;
}
