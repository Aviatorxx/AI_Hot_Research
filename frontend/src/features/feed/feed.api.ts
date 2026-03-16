import type { FeedArticle } from "@/features/feed/feed.types";
import { API_BASE } from "@/shared/config/env";
import { fetchJson } from "@/shared/lib/fetcher";

export function fetchExternalFeed(
  keywords: string[],
): Promise<{ articles: FeedArticle[] }> {
  const query = encodeURIComponent(keywords.join(","));
  return fetchJson<{ articles: FeedArticle[] }>(
    `${API_BASE}/api/feed?keywords=${query}`,
    { timeoutMs: 15_000 },
  );
}
