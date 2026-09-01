import AsyncStorage from '@react-native-async-storage/async-storage';

/** AsyncStorage adapter — avoids expo-file-system issues on SDK 54. */
export const posthogStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
