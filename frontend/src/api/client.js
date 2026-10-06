import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { loadConfig } from '../services/configService';

const FALLBACK_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Resolve the backend base URL dynamically.
 * Priority:
 *   1. User-saved server URL (from the setup screen)
 *   2. Build-time VITE_API_URL
 *   3. localhost fallback
 */
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    const cfg = loadConfig();
    if (cfg.serverUrl) {
      return `${cfg.serverUrl.replace(/\/$/, '')}/api`;
    }
  }
  return FALLBACK_URL;
}

/**
 * Return the root URL (without /api), used for refresh endpoint.
 */
function getRootUrl() {
  return getBaseUrl().replace(/\/api\/?$/, '');
}

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
});

let accessToken = null;
export const setToken = (t) => { accessToken = t; };
export const getToken = () => accessToken || useAuthStore.getState().accessToken;

// Clears persisted auth so GuestGuard sees the user as logged out
const clearAuth = () => {
  try { localStorage.removeItem('cafe-pos-auth'); } catch { }
};

api.interceptors.request.use((config) => {
  // Recompute baseURL on every request so a saved config change
  // takes effect immediately.
  config.baseURL = getBaseUrl();

  const token = useAuthStore.getState().accessToken || accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const res = await axios.post(
          `${getRootUrl()}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newAccessToken = res.data.accessToken;
        setToken(newAccessToken);
        useAuthStore.getState().setAuth(
          useAuthStore.getState().user,
          newAccessToken
        );
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(original);
      } catch (err2) {
        // Clear auth state so GuestGuard redirects properly
        setToken(null);
        useAuthStore.getState().logout();
        clearAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;