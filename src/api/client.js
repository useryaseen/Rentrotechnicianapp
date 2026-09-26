/**
 * Axios instance with request/response interceptors.
 *
 * - Request: attaches Bearer token from SecureStore.
 * - Response: on 401, clears the session and redirects to login.
 *              (We cannot redirect directly here because we are outside React;
 *               instead, we throw an error that the UI layer can catch and handle.)
 *
 * The base URL is taken from the environment variable EXPO_PUBLIC_API_BASE_URL.
 */
import axios from 'axios';
import { getToken } from '../lib/tokenStorage';

const DEFAULT_API_BASE_URL = 'https://erpapi.rentro.ae';

if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
  console.warn(`EXPO_PUBLIC_API_BASE_URL is not set. Falling back to ${DEFAULT_API_BASE_URL}`);
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

// Create the axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor: attach token
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response } = error;
    if (response && response.status === 401) {
      // Clear the session (token and profile) and signal the UI to redirect to login.
      // We reject with a special error that the UI can catch.
      return Promise.reject({ ...error, isAuthError: true });
    }
    return Promise.reject(error);
  }
);

export default api;