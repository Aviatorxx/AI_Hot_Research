import type { AggregatedTopic } from "@/features/topics/topics.types";

interface TopicLike {
  title: string;
}

type TopicsByPlatform = Record<string, TopicLike[] | undefined>;

function formatRelativeUpdateTime(updatedAt: string | null, now = new Date()): string {
  if (!updatedAt) {
    return "等待首次加载";
  }
  const diff = Math.max(0, Math.floor((now.getTime() - new Date(updatedAt).getTime()) / 1000));
  if (diff < 10) return "刚刚更新";
  if (diff < 60) return `${diff} 秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

export function summarizeDashboard(options: {
  allTopics: TopicsByPlatform;
  aggregatedTopics: AggregatedTopic[];
  updatedAt: string | null;
  analysisCount: number;
  now?: Date;
}): {
  total: number;
  activePlatforms: number;
  time: string;
  timeAgo: string;
  analysisCount: number;
  newTopics: number;
  resonance: number;
  rising: number;
} {
  const { allTopics, aggregatedTopics, updatedAt, analysisCount, now = new Date() } = options;

  let total = 0;
  let activePlatforms = 0;
  for (const topics of Object.values(allTopics)) {
    if (topics && topics.length > 0) {
      total += topics.length;
      activePlatforms += 1;
    }
  }

  return {
    total,
    activePlatforms,
    time: updatedAt
      ? new Date(updatedAt).toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : now.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
    timeAgo: formatRelativeUpdateTime(updatedAt, now),
    analysisCount,
    newTopics: aggregatedTopics.filter((topic) => topic.velocity?.direction === "new").length,
    resonance: aggregatedTopics.filter((topic) => (topic.platform_count || 0) > 1).length,
    rising: aggregatedTopics.filter((topic) => topic.velocity?.direction === "up").length,
  };
}

export function renderPlatformTabsMarkup(options: {
  allTopics: TopicsByPlatform;
  aggregatedTopics: AggregatedTopic[];
  currentPlatform: string;
  platformNames: Record<string, string>;
  visiblePlatformIds?: string[];
}): string {
  const { allTopics, aggregatedTopics, currentPlatform, platformNames, visiblePlatformIds } = options;
  const visibleIds = visiblePlatformIds?.length
    ? visiblePlatformIds
    : Object.keys(platformNames);
  const allCount = aggregatedTopics.length || Object.values(allTopics).reduce((sum, topics) => sum + (topics?.length || 0), 0);

  let html = `<button class="platform-tab ${currentPlatform === "all" ? "active" : ""}" data-platform="all" role="tab" data-action="switchPlatform" data-platform="all">
    全部平台 <span class="tab-count">${allCount}</span>
  </button>`;

  html += `<button class="platform-tab mine-tab ${currentPlatform === "mine" ? "active" : ""}" data-platform="mine" role="tab" data-action="switchPlatform" data-platform="mine">
    ⭐ 我的
  </button>`;

  for (const id of visibleIds) {
    const name = platformNames[id];
    if (!name) continue;
    const count = (allTopics[id] || []).length;
    html += `<button class="platform-tab ${currentPlatform === id ? "active" : ""}" data-platform="${id}" role="tab" data-action="switchPlatform" data-platform="${id}">
      ${name} <span class="tab-count">${count}</span>
    </button>`;
  }

  return html;
}
