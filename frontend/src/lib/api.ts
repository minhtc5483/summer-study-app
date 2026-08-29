import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { useKidsAccessStore } from '../store/useKidsAccessStore';
import { useManageAccessStore } from '../store/useManageAccessStore';

export const api = axios.create({
  baseURL: '/api',
});

const isPublicRequest = (url?: string) => !!url && url.startsWith('/public') && url !== '/public/verify-pin';
const isAuthEndpoint = (url?: string) => !!url && /^\/auth\/(login|register|refresh)/.test(url);

interface RetriableRequestConfig extends AxiosRequestConfig {
  _retriedAfterRefresh?: boolean;
}

api.interceptors.request.use((config) => {
  // Public/kids routes must always use the per-student PIN token, never the parent's — a
  // shared device where the parent is still logged in (didn't log out before handing it to
  // the kid) would otherwise send the parent's JWT here, which requireKidsAccess rejects
  // with 401 since it's signed with a different secret/scope than the kids-access token.
  if (isPublicRequest(config.url)) {
    const pinToken = useKidsAccessStore.getState().pinToken;
    if (pinToken) {
      config.headers.Authorization = `Bearer ${pinToken}`;
    }
    return config;
  }

  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Second factor for /parent routes: being logged in is no longer enough, the parent also
  // has to have entered their management PIN recently (see requireManage on the backend).
  const manageToken = useManageAccessStore.getState().manageToken;
  if (manageToken) {
    config.headers['X-Manage-Token'] = manageToken;
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

    // The PIN lapsed or was never entered on this device. This is NOT a login problem —
    // clearing the manage token makes ParentDashboard show the PIN prompt again, whereas
    // logging the parent out here would send them back to the password screen for nothing.
    if (error.response?.status === 403 && error.response?.data?.error === 'MANAGE_PIN_REQUIRED') {
      useManageAccessStore.getState().clearManageToken();
      return Promise.reject(error);
    }

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
