/**
 * JWT token storage (expo-secure-store).
 *
 * Kept separate from authService so the axios client can read the token
 * without importing authService (which itself imports the client).
 */
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = '@rentro_tech_token';

/**
 * Get the stored token.
 * @returns {Promise<string | null>}
 */
export const getToken = async () => {
  try {
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
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

/**
 * Remove the stored token.
 */
export const deleteToken = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};
