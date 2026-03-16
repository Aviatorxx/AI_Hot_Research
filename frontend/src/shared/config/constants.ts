export const PLATFORM_NAMES: Record<string, string> = {
  weibo: "微博热搜",
  zhihu: "知乎热榜",
  baidu: "百度热搜",
  douyin: "抖音热点",
  bilibili: "B站热门",
  github: "GitHub Trending",
  hackernews: "Hacker News",
};

export const PLATFORM_COLORS: Record<string, string> = {
  weibo: "#FF3366",
  zhihu: "#0066FF",
  baidu: "#3388FF",
  douyin: "#00FFFF",
  bilibili: "#FF00FF",
  github: "#8B5CF6",
  hackernews: "#FF6600",
};

export const STORAGE_KEYS = {
  authToken: "authToken",
  notifyEnabled: "notifyEnabled",
  themePreference: "themePreference",
  topicsSnapshot: "topicsSnapshot",
  visiblePlatforms: "visiblePlatforms",
} as const;
