import { fetchTopics } from "@/features/topics/topics.api";
import { mapTopicsPayload } from "@/features/topics/topics.mapper";
import { topicsStore } from "@/features/topics/topics.store";
import type { TopicsPayload } from "@/features/topics/topics.types";
import { STORAGE_KEYS } from "@/shared/config/constants";
import {
  getStoredString,
  setStoredString,
} from "@/shared/lib/storage";

const SNAPSHOT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

interface TopicsSnapshot {
  savedAt: number;
  payload: TopicsPayload;
}

function persistTopicsSnapshot(payload: TopicsPayload): void {
  const snapshot: TopicsSnapshot = {
    savedAt: Date.now(),
    payload,
  };
  setStoredString(STORAGE_KEYS.topicsSnapshot, JSON.stringify(snapshot));
}

export function hydrateTopicsSnapshot(): boolean {
  const raw = getStoredString(STORAGE_KEYS.topicsSnapshot);
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as TopicsSnapshot;
    if (!parsed?.payload || typeof parsed.savedAt !== "number") {
      return false;
    }
    if (Date.now() - parsed.savedAt > SNAPSHOT_MAX_AGE_MS) {
      return false;
    }

    const payload = mapTopicsPayload(parsed.payload);
    topicsStore.setState((state) => ({
      ...state,
      platforms: payload.platforms,
      aggregatedTopics: payload.aggregated_topics,
      updatedAt: payload.updated_at,
      loading: false,
      error: null,
    }));
    return true;
  } catch {
    return false;
  }
}

async function updateTopics(force: boolean): Promise<TopicsPayload> {
  topicsStore.setState((state) => ({
    ...state,
    loading: true,
    error: null,
  }));

  try {
    const payload = mapTopicsPayload(await fetchTopics(force));
    topicsStore.setState((state) => ({
      ...state,
      platforms: payload.platforms,
      aggregatedTopics: payload.aggregated_topics,
      updatedAt: payload.updated_at,
      loading: false,
      error: null,
    }));
    persistTopicsSnapshot(payload);
    return payload;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "获取热点数据失败";
    topicsStore.setState((state) => ({
      ...state,
      loading: false,
      error: message,
    }));
    throw error;
  }
}

export function loadTopics(): Promise<TopicsPayload> {
  return updateTopics(false);
}

export function refreshTopics(): Promise<TopicsPayload> {
  return updateTopics(true);
}
