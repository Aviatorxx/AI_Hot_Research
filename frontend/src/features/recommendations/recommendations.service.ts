import { fetchRecommendationsRequest } from "@/features/recommendations/recommendations.api";
import { recommendationsStore } from "@/features/recommendations/recommendations.store";
import type { RecommendationResult } from "@/features/recommendations/recommendations.types";

export async function loadRecommendations(): Promise<RecommendationResult> {
  recommendationsStore.setState((state) => ({
    ...state,
    loading: true,
  }));

  try {
    const data = await fetchRecommendationsRequest();
    recommendationsStore.setState((state) => ({
      ...state,
      data,
      loading: false,
    }));
    return data;
  } catch (error) {
    recommendationsStore.setState((state) => ({
      ...state,
      loading: false,
    }));
    throw error;
  }
}
