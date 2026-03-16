import { fetchExternalFeed } from "@/features/feed/feed.api";
import { feedStore } from "@/features/feed/feed.store";
import type { FeedArticle } from "@/features/feed/feed.types";

export async function loadExternalFeed(
  keywords: string[],
): Promise<FeedArticle[]> {
  feedStore.setState((state) => ({
    ...state,
    loading: true,
  }));

  try {
    const data = await fetchExternalFeed(keywords);
    const articles = data.articles ?? [];
    feedStore.setState((state) => ({
      ...state,
      articles,
      loading: false,
    }));
    return articles;
  } catch (error) {
    feedStore.setState((state) => ({
      ...state,
      loading: false,
    }));
    throw error;
  }
}
