import type { TopicPlatformDetail, TopicVelocity } from "@/features/topics/topics.types";

export interface HotFeedViewModel {
  totalTopics: number;
  currentPlatform: string;
  searchQuery: string;
}

export interface HotFeedTopic {
  title: string;
  url?: string;
  hot_value?: string;
  category?: string;
  platform?: string;
  rank?: number;
  platforms?: string[];
  platform_count?: number;
  platform_details?: TopicPlatformDetail[];
  aliases?: string[];
  velocity?: TopicVelocity;
  aggregate_score?: number;
}
