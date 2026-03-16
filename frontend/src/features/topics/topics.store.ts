import type { TopicsState } from "@/features/topics/topics.types";
import { createStore } from "@/shared/lib/store";

const initialState: TopicsState = {
  platforms: {},
  aggregatedTopics: [],
  updatedAt: null,
  loading: false,
  error: null,
};

export const topicsStore = createStore(initialState);
