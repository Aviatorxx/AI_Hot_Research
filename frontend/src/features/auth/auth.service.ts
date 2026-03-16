import {
  fetchCurrentUser,
  login,
  register,
  updateProfile,
} from "@/features/auth/auth.api";
import { authStore } from "@/features/auth/auth.store";
import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  ProfileUpdateRequest,
} from "@/features/auth/auth.types";
import { STORAGE_KEYS } from "@/shared/config/constants";
import {
  getStoredString,
  removeStoredValue,
  setStoredString,
} from "@/shared/lib/storage";

function applyAuth(auth: { token: string | null; currentUser: AuthUser | null }) {
  authStore.setState((state) => ({
    ...state,
    token: auth.token,
    currentUser: auth.currentUser,
  }));
}

export async function submitAuthRequest(
  mode: "login" | "register",
  payload: LoginRequest,
): Promise<AuthResponse> {
  const response =
    mode === "login" ? await login(payload) : await register(payload);

  setStoredString(STORAGE_KEYS.authToken, response.token);
  applyAuth({
    token: response.token,
    currentUser: {
      id: response.id,
      username: response.username,
      nickname: response.nickname,
      avatar_preset: response.avatar_preset,
      avatar_data: response.avatar_data,
    },
  });

  return response;
}

export async function verifyAuthSession(): Promise<AuthUser | null> {
  const token = authStore.getState().token ?? getStoredString(STORAGE_KEYS.authToken);
  if (!token) return null;

  try {
    const user = await fetchCurrentUser(token);
    applyAuth({ token, currentUser: user });
    return user;
  } catch (error) {
    clearAuthSession();
    throw error;
  }
}

export function clearAuthSession(): void {
  removeStoredValue(STORAGE_KEYS.authToken);
  applyAuth({ token: null, currentUser: null });
}

export function getAuthToken(): string | null {
  return authStore.getState().token ?? getStoredString(STORAGE_KEYS.authToken);
}

export async function saveProfileUpdate(payload: ProfileUpdateRequest) {
  const token = getAuthToken();
  if (!token) {
    throw new Error("请先登录");
  }
  const user = await updateProfile(token, payload);
  applyAuth({ token, currentUser: user });
  return user;
}
