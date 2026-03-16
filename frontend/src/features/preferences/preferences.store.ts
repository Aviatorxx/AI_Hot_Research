import type { PreferencesState } from "@/features/preferences/preferences.types";
import { createStore } from "@/shared/lib/store";

const initialState: PreferencesState = {
  likes: {},
  keywords: [],
};

export const preferencesStore = createStore(initialState);
