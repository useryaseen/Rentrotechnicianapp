import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConnectivityProvider } from '@/connectivity-context';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import useAuthStore from '@/store/authStore';
import useNotificationStore from '@/store/notificationStore';
import { colors } from '@/theme';

import NoInternetScreen from '@/no-internet';

// Import the QueryClient and persister
import { queryClient } from '@/lib/queryClient';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  // Auth store
  const { isTechnician } = useAuthStore();
  // Notification store
  const { startPolling, stopPolling } = useNotificationStore();

  // Start/stop notification polling based on auth state
  useEffect(() => {
    if (isTechnician) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => {
      stopPolling();
    };
  }, [isTechnician, startPolling, stopPolling]);

  // Wait for the app font; if it fails to load, fall back to the system font.
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ConnectivityProvider>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Slot />
          <StatusBar style="auto" />
          <NoInternetScreen />
        </QueryClientProvider>
      </SafeAreaProvider>
    </ConnectivityProvider>
  );
}
