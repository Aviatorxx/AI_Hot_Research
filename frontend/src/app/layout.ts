import type { AggregatedTopic } from "@/features/topics/topics.types";
import { CATEGORY_NAMES, CATEGORY_ORDER } from "@/shared/config/constants";

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
  browseMode?: "all" | "mine" | "category";
  activeCategory?: string;
}): string {
  const {
    allTopics,
    aggregatedTopics,
    currentPlatform,
    platformNames,
    visiblePlatformIds,
    browseMode = currentPlatform === "mine" ? "mine" : currentPlatform === "category" ? "category" : "all",
    activeCategory = "all",
  } = options;
  const visibleIds = visiblePlatformIds?.length
    ? visiblePlatformIds
    : Object.keys(platformNames);
  const allCount = aggregatedTopics.length || Object.values(allTopics).reduce((sum, topics) => sum + (topics?.length || 0), 0);
  const categoryCounts = aggregatedTopics.reduce<Record<string, number>>((acc, topic) => {
    const key = topic.normalized_category || "other";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  let html = `<div class="platform-tab-group platform-tab-group--primary" role="presentation">
    <button class="platform-tab ${browseMode === "all" ? "active" : ""}" data-platform="all" role="tab" data-action="switchPlatform">
      全部平台 <span class="tab-count">${allCount}</span>
    </button>
    <button class="platform-tab mine-tab ${browseMode === "mine" ? "active" : ""}" data-platform="mine" role="tab" data-action="switchPlatform">
      ⭐ 我的
    </button>
    <button class="platform-tab category-tab ${browseMode === "category" ? "active" : ""}" data-platform="category" role="tab" data-action="switchPlatform">
      按类型
    </button>
  </div>`;

  html += '<span class="platform-tab-divider" aria-hidden="true"></span>';
  html += `<div class="platform-tab-group platform-tab-group--sources${browseMode === "category" ? " is-category" : ""}" role="presentation">`;

  if (browseMode === "category") {
    for (const categoryId of CATEGORY_ORDER) {
      const label = CATEGORY_NAMES[categoryId];
      if (!label) continue;
      const count = categoryId === "all" ? allCount : categoryCounts[categoryId] || 0;
      html += `<button class="platform-tab category-filter ${activeCategory === categoryId ? "active" : ""}" data-action="setCategory" data-category="${categoryId}" role="tab">
        ${label} <span class="tab-count">${count}</span>
      </button>`;
    }
    html += "</div>";
    return html;
  }

  for (const id of visibleIds) {
    const name = platformNames[id];
    if (!name) continue;
    const count = (allTopics[id] || []).length;
    html += `<button class="platform-tab ${currentPlatform === id ? "active" : ""}" data-platform="${id}" role="tab" data-action="switchPlatform" data-platform="${id}">
      ${name} <span class="tab-count">${count}</span>
    </button>`;
  }

  html += "</div>";
  return html;
}
