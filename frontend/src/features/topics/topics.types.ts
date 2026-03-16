export interface TopicVelocity {
  direction: "new" | "up" | "down" | "flat";
  delta: number;
  label: string;
}

export interface TopicPlatformDetail {
  platform: string;
  rank?: number | string;
  hot_value?: string;
}

export interface Topic {
  title: string;
  url?: string;
  hot_value?: string;
  category?: string;
  platform?: string;
  rank?: number;
  topic_key?: string;
  velocity?: TopicVelocity;
}

export interface AggregatedTopic {
  title: string;
  url?: string;
  hot_value?: string;
  category?: string;
  rank?: number;
  platforms: string[];
  platform_count: number;
  platform_details?: TopicPlatformDetail[];
  aliases?: string[];
  velocity?: TopicVelocity;
  aggregate_score?: number;
}

export type TopicsByPlatform = Record<string, Topic[]>;

export interface TopicsPayload {
  platforms: TopicsByPlatform;
  aggregated_topics: AggregatedTopic[];
  updated_at: string | null;
}

export interface TopicsState {
  platforms: TopicsByPlatform;
  aggregatedTopics: AggregatedTopic[];
  updatedAt: string | null;
  loading: boolean;
  error: string | null;
}
