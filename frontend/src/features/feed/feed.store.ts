import type { FeedState } from "@/features/feed/feed.types";
import { createStore } from "@/shared/lib/store";

const initialState: FeedState = {
  articles: [],
  loading: false,
};

export const feedStore = createStore(initialState);
