/**
 * Auth store (zustand).
 *
 * Holds the authentication state: token, profile, and technician flag.
 *
 * Actions: login, logout, clearProfile.
 *
 * We subscribe to SecureStore changes? Not necessary; we will call getToken/getProfile on demand.
 * Instead, we keep the store in sync with the async storage by updating it after login/logout.
 */
import { create } from 'zustand';
import { getToken, clearToken, getProfile, saveProfile, clearProfile, getDisplayName, getUserId, login as authLogin, clearSession } from '../api/authService';

/**
 * @typedef {Object} AuthState
 * @property {string | null} token - The JWT token
 * @property {Object | null} profile - { techId, displayName, apiUsername }
 * @property {boolean} isTechnician - True if the profile exists (i.e., the user is a technician)
 * @property {string | null} displayName - Cached display name (from profile or JWT)
 * @property {string | null} userId - Cached userId (from JWT)
 * @property {(username: string, password: string) => Promise<void>} login
 * @property {() => void} logout
 * @property {() => void} clearProfile
 */
const useAuthStore = create((set, get) => ({
  token: null,
  profile: null,
  isTechnician: false,
  displayName: null,
  userId: null,
  username: null,

  login: async (username, password) => {
    try {
      const { token } = await authLogin(username, password);
      set({ token });
      // Fetch and save the profile (from hard-coded table for now)
      const profile = await getProfile();
      if (!profile) {
        await clearSession();
        set({ token: null });
        throw new Error('This account is not registered as a technician.');
      }
      set({ profile, isTechnician: true });
      // Also cache displayName and userId from JWT
      const [displayName, userId] = await Promise.all([
        getDisplayName(),
        getUserId(),
      ]);
      set({ displayName, userId, username });
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    await clearSession();
    set({
      token: null,
      profile: null,
      isTechnician: false,
      displayName: null,
      userId: null,
      username: null,
    });
  },

  clearProfile: async () => {
    await clearProfile();
    set({ profile: null, isTechnician: false });
  },
}));

export default useAuthStore;