export interface PreferenceLike {
  value: string;
  platform: string;
  url: string;
}

export interface PreferenceKeyword {
  id: number;
  value: string;
}

export interface PreferencesResponse {
  likes: PreferenceLike[];
  keywords: PreferenceKeyword[];
  logged_in: boolean;
}

export interface PreferencesState {
  likes: Record<string, { platform: string; url: string }>;
  keywords: PreferenceKeyword[];
}
