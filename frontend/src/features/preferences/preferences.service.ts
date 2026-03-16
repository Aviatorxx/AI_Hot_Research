import {
  createKeyword,
  deleteKeywordRequest,
  fetchPreferences,
  likeTopic,
  unlikeTopic,
} from "@/features/preferences/preferences.api";
import { preferencesStore } from "@/features/preferences/preferences.store";
import type {
  PreferenceKeyword,
  PreferencesResponse,
} from "@/features/preferences/preferences.types";

function mapLikes(data: PreferencesResponse["likes"]) {
  return Object.fromEntries(
    (data ?? []).map((like) => [
      like.value,
      { platform: like.platform, url: like.url },
    ]),
  );
}

export async function loadPreferencesState(): Promise<PreferencesResponse> {
  const data = await fetchPreferences();
  preferencesStore.setState((state) => ({
    ...state,
    likes: mapLikes(data.likes),
    keywords: data.keywords ?? [],
  }));
  return data;
}

export async function toggleTopicLike(payload: {
  title: string;
  platform: string;
  url: string;
}): Promise<boolean> {
  const state = preferencesStore.getState();
  const isLiked = Boolean(state.likes[payload.title]);

  if (isLiked) {
    preferencesStore.setState((prev) => {
      const nextLikes = { ...prev.likes };
      delete nextLikes[payload.title];
      return { ...prev, likes: nextLikes };
    });
    await unlikeTopic(payload.title);
    return false;
  }

  preferencesStore.setState((prev) => ({
    ...prev,
    likes: {
      ...prev.likes,
      [payload.title]: {
        platform: payload.platform,
        url: payload.url,
      },
    },
  }));
  await likeTopic(payload);
  return true;
}

export async function removePreferenceLike(title: string): Promise<void> {
  preferencesStore.setState((prev) => {
    const nextLikes = { ...prev.likes };
    delete nextLikes[title];
    return {
      ...prev,
      likes: nextLikes,
    };
  });
  await unlikeTopic(title);
}

export async function addPreferenceKeyword(
  keyword: string,
): Promise<PreferenceKeyword[]> {
  const data = await createKeyword(keyword);
  preferencesStore.setState((state) => ({
    ...state,
    keywords: data.keywords ?? state.keywords,
  }));
  return data.keywords ?? preferencesStore.getState().keywords;
}

export async function removePreferenceKeyword(id: number): Promise<void> {
  preferencesStore.setState((state) => ({
    ...state,
    keywords: state.keywords.filter((item) => item.id !== id),
  }));
  await deleteKeywordRequest(id);
}

export function clearPreferencesState(): void {
  preferencesStore.setState(() => ({
    likes: {},
    keywords: [],
  }));
}
