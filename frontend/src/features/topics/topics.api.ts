import type { TopicsPayload } from "@/features/topics/topics.types";
import { API_BASE } from "@/shared/config/env";
import { fetchJson } from "@/shared/lib/fetcher";

export async function fetchTopics(force = false): Promise<TopicsPayload> {
  const suffix = force ? "?refresh=true" : "";
  return fetchJson<TopicsPayload>(`${API_BASE}/api/topics${suffix}`);
}
