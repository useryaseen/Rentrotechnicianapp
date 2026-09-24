import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import useAuthStore from '@/store/authStore';
import useNotificationStore from '@/store/notificationStore';

// Import the QueryClient and persister
import { queryClient } from '@/lib/queryClient';

export default function RootLayout() {
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

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {/* The router will handle the screens */}
        <Slot />
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
