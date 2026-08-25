import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useKidsAccessStore } from '../store/useKidsAccessStore';

export const api = axios.create({
  baseURL: '/api',
});

const isPublicRequest = (url?: string) => !!url && url.startsWith('/public') && url !== '/public/verify-pin';
const isAuthEndpoint = (url?: string) => !!url && /^\/auth\/(login|register|refresh)/.test(url);

interface RetriableRequestConfig extends AxiosRequestConfig {
  _retriedAfterRefresh?: boolean;
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (isPublicRequest(config.url)) {
    const pinToken = useKidsAccessStore.getState().pinToken;
    if (pinToken) {
      config.headers.Authorization = `Bearer ${pinToken}`;
    }
  }
  return config;
});

// Access tokens expire after 15 minutes (see backend/src/middlewares/auth.ts). Rather than
// forcing the parent to log back in every time one expires, transparently exchange the
// long-lived refresh token for a new one and retry the original request exactly once.
// Concurrent 401s share a single in-flight refresh call instead of each firing their own.
let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, user } = useAuthStore.getState();
  if (!refreshToken || !user) {
    return Promise.resolve(null);
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post('/api/auth/refresh', { refreshToken })
      .then((res) => {
        const newToken: string = res.data.token;
        const newRefreshToken: string = res.data.refreshToken ?? refreshToken;
        useAuthStore.getState().setAuth(newToken, newRefreshToken, user);
        return newToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (error.response?.status === 401) {
      if (isPublicRequest(originalRequest?.url)) {
        // PIN token missing/expired — clear it so the PIN prompt reappears.
        useKidsAccessStore.getState().clearPinToken();
        return Promise.reject(error);
      }

      const canTryRefresh =
        !!originalRequest &&
        !originalRequest._retriedAfterRefresh &&
        !isAuthEndpoint(originalRequest.url) &&
        !!useAuthStore.getState().token;

      if (canTryRefresh) {
        originalRequest._retriedAfterRefresh = true;
        const newToken = await refreshAccessToken();
        if (newToken) {
          originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${newToken}` };
          return api(originalRequest);
        }
      }

      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
