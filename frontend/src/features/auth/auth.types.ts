export interface AuthUser {
  id?: number;
  username: string;
  nickname?: string | null;
  avatar_preset?: string | null;
  avatar_data?: string | null;
}

export interface AuthState {
  token: string | null;
  currentUser: AuthUser | null;
}

export interface AuthResponse {
  token: string;
  username: string;
  id?: number;
  nickname?: string | null;
  avatar_preset?: string | null;
  avatar_data?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface ProfileUpdateRequest {
  nickname?: string | null;
  avatar_preset?: string | null;
  avatar_data?: string | null;
}
