import { getAuthToken } from "@/features/auth/auth.service";
import type { RecommendationResult } from "@/features/recommendations/recommendations.types";
import { API_BASE } from "@/shared/config/env";
import { fetchJson } from "@/shared/lib/fetcher";

export function fetchRecommendationsRequest(): Promise<RecommendationResult> {
  const token = getAuthToken();
  const headers: HeadersInit = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  return fetchJson<RecommendationResult>(`${API_BASE}/api/recommend`, {
    method: "POST",
    headers,
    timeoutMs: 60_000,
  });
}
