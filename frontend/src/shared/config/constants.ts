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

export const CATEGORY_NAMES: Record<string, string> = {
  all: "全部",
  politics: "政治",
  finance: "财经",
  tech: "科技",
  society: "社会",
  entertainment: "文娱",
  anime: "动漫游戏",
  sports: "体育",
  world: "国际",
  lifestyle: "生活消费",
  education: "校园教育",
  other: "其他",
};

export const CATEGORY_ORDER = [
  "all",
  "politics",
  "finance",
  "tech",
  "society",
  "entertainment",
  "anime",
  "sports",
  "world",
  "lifestyle",
  "education",
  "other",
] as const;

export const STORAGE_KEYS = {
  authToken: "authToken",
  notifyEnabled: "notifyEnabled",
  themePreference: "themePreference",
  fontScale: "fontScale",
  topicsSnapshot: "topicsSnapshot",
  visiblePlatforms: "visiblePlatforms",
} as const;
