/**
 * JWT token storage (expo-secure-store).
 *
 * Kept separate from authService so the axios client can read the token
 * without importing authService (which itself imports the client).
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'rentro_tech_token';

// expo-secure-store has no web implementation, so fall back to localStorage there.
const isWeb = Platform.OS === 'web';

/**
 * Get the stored token.
 * @returns {Promise<string | null>}
 */
export const getToken = async () => {
  try {
    if (isWeb) return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
};

/**
 * Store the token.
 * @param {string} token
 */
export const setToken = async (token) => {
  if (isWeb) {
    globalThis.localStorage?.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

/**
 * Remove the stored token.
 */
export const deleteToken = async () => {
  if (isWeb) {
    globalThis.localStorage?.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};
