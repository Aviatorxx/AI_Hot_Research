import type { RecommendationsState } from "@/features/recommendations/recommendations.types";
import { createStore } from "@/shared/lib/store";

const initialState: RecommendationsState = {
  data: null,
  loading: false,
};

export const recommendationsStore = createStore(initialState);
