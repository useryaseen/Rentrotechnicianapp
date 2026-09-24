/**
 * React Query client setup with AsyncStorage persister.
 *
 * The client is created once and provided via QueryClientProvider in the root layout.
 * We also expose a `getQueryClient` function for imperatively accessing the client
 * (e.g., to invalidate queries from outside React components).
 *
 * See spec §3 for the exact query keys that must be used.
 */
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/**
 * Persister for AsyncStorage.
 * The persister will store the cache in AsyncStorage under the key '@react-query'.
 */
export const persister = createAsyncStoragePersister({
  // @react-native-async-storage/async-storage
  storage: window.AsyncStorage ?? global.AsyncStorage, // In React Native, it's global; in web, it's window
});

// If the above doesn't work, we can import it directly:
/* import AsyncStorage from '@react-native-async-storage/async-storage';
export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
}); */

/**
 * Create the QueryClient.
 * We set default staleTime to 0 so that data is considered stale immediately,
 * matching the web app's behavior (where every request is fresh unless cached by React Query).
 * In practice, we rely on manual invalidation (via queryClient.invalidateQueries) and
 * the persister for offline tolerance.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Consider data stale immediately (forces refetch on window focus unless we manually set)
      // We do not set cacheTime; default is 5 minutes.
      // We do not set refetchOnWindowFocus: false because we want to refresh when the app comes to foreground.
      // However, in React Native, window focus events are not available; we rely on AppState.
      // We'll handle AppState in the root layout to refetch when the app becomes active.
    },
    mutations: {
      // We do not set any default options for mutations.
    },
  },
});

/**
 * Returns the query client instance.
 * Useful for imperatively invalidating queries from outside React components (e.g., in stores).
 */
export const getQueryClient = () => queryClient;

export default { queryClient, persister, getQueryClient };