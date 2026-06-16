import { Redirect } from 'expo-router';
import useAuthStore from '../stores/authStore';

export default function Index() {
  const { user, initialized, loading } = useAuthStore();

  // Session known early from onAuthStateChange — go straight to dashboard skeleton
  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  if (loading || !initialized) {
    return null;
  }

  return <Redirect href="/(auth)/welcome" />;
}
