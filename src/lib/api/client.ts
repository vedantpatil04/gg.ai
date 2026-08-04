import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 60_000,
});

// ─── Request interceptor: attach access token ────────────────────────────────
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("gg_access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: silent refresh on 401, forbidden handling on 403 ─
let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

client.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = localStorage.getItem("gg_refresh_token");
      if (!refreshToken) {
        clearTokens();
        window.dispatchEvent(new Event("gg:logout"));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            if (original.headers) original.headers.Authorization = `Bearer ${token}`;
            resolve(client(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data;
        localStorage.setItem("gg_access_token", accessToken);
        localStorage.setItem("gg_refresh_token", newRefresh);

        queue.forEach((cb) => cb(accessToken));
        queue = [];

        if (original.headers) original.headers.Authorization = `Bearer ${accessToken}`;
        return client(original);
      } catch {
        clearTokens();
        window.dispatchEvent(new Event("gg:logout"));
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // 403: the session itself is still valid — this signed-in user just
    // isn't allowed to do this particular thing. Unlike 401, we keep the
    // session and don't touch tokens; we just let the app route the user
    // to somewhere they *are* allowed, instead of surfacing a raw
    // "Forbidden" error. /auth/* is excluded since login's own
    // portal/role-mismatch 403 is already handled locally by the login
    // page and happens before any session exists.
    if (error.response?.status === 403 && !original.url?.startsWith("/auth/")) {
      window.dispatchEvent(new Event("gg:forbidden"));
    }

    return Promise.reject(error);
  },
);

export function clearTokens() {
  localStorage.removeItem("gg_access_token");
  localStorage.removeItem("gg_refresh_token");
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("gg_access_token", access);
  localStorage.setItem("gg_refresh_token", refresh);
}

export default client;
