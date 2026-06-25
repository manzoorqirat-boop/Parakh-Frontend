import axios, { AxiosError } from "axios";

// Token storage. Access token in memory + localStorage for reload survival.
// (Mirrors the backend's deferred hardening note on JWT storage.)
const ACCESS_KEY = "parakh.access";
const REFRESH_KEY = "parakh.refresh";

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// In dev, "/api" is proxied by Vite to the backend (see vite.config.ts).
// In production there is no proxy, so VITE_API_URL must point at the deployed
// backend's full origin; we append "/api" to it. Baked in at build time.
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear tokens and bounce to login (handled by the auth provider).
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

// Normalises the backend's RFC7807 problem responses into a readable message.
export function apiError(e: unknown): string {
  const err = e as AxiosError<{ detail?: string; title?: string }>;
  return (
    err.response?.data?.detail ||
    err.response?.data?.title ||
    err.message ||
    "Something went wrong."
  );
}
