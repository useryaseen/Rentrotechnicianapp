/**
 * Authentication service.
 *
 * Handles login, token storage, and profile retrieval.
 *
 * Token is stored in expo-secure-store (key: 'rentro_tech_token').
 * Profile is stored in AsyncStorage (key: '@rentro_tech_profile').
 *
 * The web app stores token in localStorage and profile in localStorage (technicianProfiles.js is hard-coded).
 * On mobile, we follow the spec: token in SecureStore, profile in AsyncStorage (or SecureStore).
 * We choose AsyncStorage for profile because it's non-sensitive and we might want to share it with other
 * libraries (like the persister) that expect AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTechnicianProfile } from '../config/technicianProfiles';
import { getToken, setToken, deleteToken } from '../lib/tokenStorage';
import api from './client';

export { getToken };

const PROFILE_KEY = '@rentro_tech_profile';

/**
 * Login with username and password.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ token: string }>} - The response from the API (must contain `token`)
 */
export const login = async (username, password) => {
  const response = await api.post('/api/Users/login', { username, password });
  if (!response.data || !response.data.token) {
    throw new Error('Login succeeded but no token was returned.');
  }
  const token = response.data.token;
  await setToken(token);
  return { token };
};

/**
 * Remove the token (and profile) from storage.
 * Called on logout or 401.
 */
export const clearToken = async () => {
  await deleteToken();
  await clearProfile();
};

/**
 * Get the decoded JWT payload (if we have a token).
 * Returns an object with the claims we need: name and userId.
 * @returns {Promise<{ name?: string, userId?: string, UserId?: string, [claim: string]: any } | null>}
 */
export const getJwtPayload = async () => {
  const token = await getToken();
  if (!token) return null;
  try {
    // Split the token and decode the payload
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return null;
    // JWTs use base64url: swap URL-safe characters and restore padding for atob
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    // Decode UTF-8 bytes so non-ASCII names survive
    const payloadJson = decodeURIComponent(
      Array.from(binary, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
};

/**
 * Get the display name from the JWT payload, with fallbacks.
 * Mirrors the web app's logic in src/utils/auth.js.
 * @returns {Promise<string | null>} - The display name or null if not available
 */
export const getDisplayName = async () => {
  const payload = await getJwtPayload();
  if (!payload) return null;
  // The web app uses: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.name
  const nameClaim = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
  if (nameClaim) return nameClaim;
  return payload.name || null;
};

/**
 * Get the userId from the JWT payload (for notifications).
 * Falls back to payload.userId.
 * @returns {Promise<string | null>}
 */
export const getUserId = async () => {
  const payload = await getJwtPayload();
  if (!payload) return null;
  return payload.UserId || payload.userId || null;
};

/**
 * Get the technician profile (techId, displayName, apiUsername) for the currently logged-in user.
 *
 * First tries to get a profile from AsyncStorage (if we have previously fetched it from an identity endpoint).
 * If not found, falls back to the hard-coded table in technicianProfiles.js using the username from the JWT.
 *
 * @returns {Promise<{ techId: string, displayName: string, apiUsername: string } | null>}
 */
export const getProfile = async () => {
  try {
    const json = await AsyncStorage.getItem(PROFILE_KEY);
    if (json) return JSON.parse(json);
  } catch {
    // Ignore errors and fall back to the hard-coded table
  }
  // Fallback: use the hard-coded table based on the username from the JWT
  const payload = await getJwtPayload();
  if (!payload) return null;
  const username = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.name;
  if (!username) return null;
  const profile = getTechnicianProfile(username);
  if (!profile) return null;
  return {
    techId: profile.techId,
    displayName: profile.displayName,
    apiUsername: profile.apiUsername,
  };
};

/**
 * Save the technician profile to AsyncStorage.
 * This would be called if we had an identity endpoint that returns the profile for the logged-in user.
 * @param {Object} profile - { techId, displayName, apiUsername }
 */
export const saveProfile = async (profile) => {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

/**
 * Clear the profile from AsyncStorage.
 */
export const clearProfile = async () => {
  await AsyncStorage.removeItem(PROFILE_KEY);
};

/**
 * Clear both token and profile (called on logout or 401).
 */
export const clearSession = async () => {
  await clearToken();
  await clearProfile();
};

export default {
  login,
  getToken,
  clearToken,
  getJwtPayload,
  getDisplayName,
  getUserId,
  getProfile,
  saveProfile,
  clearProfile,
  clearSession,
};