import type { FeedArticle } from "@/features/feed/feed.types";

export interface RecommendedTopic {
  title: string;
  url?: string;
  platform?: string;
  reason?: string;
}

export interface RecommendationResult {
  query_summary?: string;
  interest_tags?: string[];
  recommended_topics?: RecommendedTopic[];
  report?: string;
  fetched_articles?: FeedArticle[];
}

export interface RecommendationsState {
  data: RecommendationResult | null;
  loading: boolean;
}
