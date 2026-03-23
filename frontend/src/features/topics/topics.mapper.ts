import type {
  AggregatedTopic,
  Topic,
  TopicsByPlatform,
  TopicsPayload,
} from "@/features/topics/topics.types";

function normalizeTopics(topics: Topic[] = []): Topic[] {
  return topics.map((topic) => ({
    title: topic.title ?? "",
    url: topic.url ?? "",
    hot_value: topic.hot_value ?? "",
    category: topic.category ?? "",
    normalized_category: topic.normalized_category ?? "",
    platform: topic.platform,
    rank: typeof topic.rank === "number" ? topic.rank : Number(topic.rank || 0) || undefined,
    topic_key: topic.topic_key ?? "",
    velocity: topic.velocity
      ? {
          direction: topic.velocity.direction ?? "flat",
          delta: Number(topic.velocity.delta || 0),
          label: topic.velocity.label ?? "→",
        }
      : undefined,
  }));
}

function normalizeAggregatedTopics(topics: AggregatedTopic[] = []): AggregatedTopic[] {
  return topics.map((topic) => ({
    title: topic.title ?? "",
    url: topic.url ?? "",
    hot_value: topic.hot_value ?? "",
    category: topic.category ?? "",
    normalized_category: topic.normalized_category ?? "",
    rank: typeof topic.rank === "number" ? topic.rank : Number(topic.rank || 0) || undefined,
    platforms: (topic.platforms || []).filter(Boolean),
    platform_count: Number(topic.platform_count || 0),
    platform_details: (topic.platform_details || []).map((detail) => ({
      platform: detail.platform ?? "",
      rank:
        typeof detail.rank === "number"
          ? detail.rank
          : Number(detail.rank || 0) || undefined,
      hot_value: detail.hot_value ?? "",
    })),
    aliases: (topic.aliases || []).filter(Boolean),
    velocity: topic.velocity
      ? {
          direction: topic.velocity.direction ?? "flat",
          delta: Number(topic.velocity.delta || 0),
          label: topic.velocity.label ?? "→",
        }
      : undefined,
    aggregate_score: Number(topic.aggregate_score || 0),
  }));
}

export function mapTopicsPayload(payload: TopicsPayload): TopicsPayload {
  const platforms: TopicsByPlatform = {};

  for (const [platform, topics] of Object.entries(payload.platforms ?? {})) {
    platforms[platform] = normalizeTopics(topics);
  }

  return {
    platforms,
    aggregated_topics: normalizeAggregatedTopics(payload.aggregated_topics),
    updated_at: payload.updated_at ?? null,
  };
}
