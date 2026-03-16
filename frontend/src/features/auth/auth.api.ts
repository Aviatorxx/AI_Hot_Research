import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  ProfileUpdateRequest,
} from "@/features/auth/auth.types";
import { API_BASE } from "@/shared/config/env";
import { fetchJson } from "@/shared/lib/fetcher";

export function login(payload: LoginRequest): Promise<AuthResponse> {
  return fetchJson<AuthResponse>(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function register(payload: LoginRequest): Promise<AuthResponse> {
  return fetchJson<AuthResponse>(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchCurrentUser(token: string): Promise<AuthUser> {
  return fetchJson<AuthUser>(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateProfile(token: string, payload: ProfileUpdateRequest): Promise<AuthUser> {
  return fetchJson<AuthUser>(`${API_BASE}/api/auth/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}
