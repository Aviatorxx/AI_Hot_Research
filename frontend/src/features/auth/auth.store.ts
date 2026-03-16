import type { AuthState } from "@/features/auth/auth.types";
import { STORAGE_KEYS } from "@/shared/config/constants";
import { createStore } from "@/shared/lib/store";
import { getStoredString } from "@/shared/lib/storage";

const initialState: AuthState = {
  token: getStoredString(STORAGE_KEYS.authToken),
  currentUser: null,
};

export const authStore = createStore(initialState);
