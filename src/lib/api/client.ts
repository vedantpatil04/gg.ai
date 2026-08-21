import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

function getApiBase(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim().replace(/\/+$/, "");
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }
  // Production fallback on Vercel / non-localhost web deployments
  if (
    import.meta.env.PROD ||
    (typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1")
  ) {
    return "https://gg-ai-11ja.onrender.com/api";
  }
  return "http://localhost:5000/api";
}

export const API_BASE = getApiBase();

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
interface QueueItem {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}

let isRefreshing = false;
let queue: QueueItem[] = [];

client.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = (error.config || {}) as any;
    const url = original.url || "";
    const isAuthBypass =
      url.includes("/auth/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/signup") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password") ||
      url.includes("/auth/2fa-challenge");

    if (error.response?.status === 401 && !original._retry && !isAuthBypass) {
      const refreshToken = localStorage.getItem("gg_refresh_token");
      if (!refreshToken) {
        clearTokens();
        window.dispatchEvent(new Event("gg:logout"));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({
            resolve: (token: string) => {
              if (original.headers) original.headers.Authorization = `Bearer ${token}`;
              resolve(client(original));
            },
            reject: (err: unknown) => {
              reject(err);
            },
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data;
        setTokens(accessToken, newRefresh);

        const currentQueue = queue;
        queue = [];
        currentQueue.forEach((item) => item.resolve(accessToken));

        if (original.headers) original.headers.Authorization = `Bearer ${accessToken}`;
        return client(original);
      } catch (refreshErr) {
        const currentQueue = queue;
        queue = [];
        currentQueue.forEach((item) => item.reject(refreshErr));

        clearTokens();
        window.dispatchEvent(new Event("gg:logout"));
        return Promise.reject(refreshErr);
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
