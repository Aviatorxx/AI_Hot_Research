import { CATEGORY_NAMES } from "@/shared/config/constants";

const RAW_CATEGORY_HINTS: Record<string, string[]> = {
  politics: ["时政", "政治", "政策", "政府", "外交", "军情", "两会", "国际政治"],
  finance: ["财经", "经济", "金融", "商业", "投资", "股票", "基金", "证券", "银行", "business", "finance"],
  tech: ["科技", "数码", "互联网", "软件", "开源", "模型", "github", "hacker news", "tech", "programming"],
  society: ["社会", "民生", "法治", "热点", "新闻", "突发", "事故", "通报"],
  entertainment: ["娱乐", "文娱", "明星", "影视", "综艺", "音乐", "演唱会"],
  anime: ["动漫", "游戏", "二次元", "番剧", "漫画", "电竞", "gaming", "anime"],
  sports: ["体育", "足球", "篮球", "f1", "奥运", "比赛", "sports"],
  world: ["国际", "海外", "全球", "world", "international"],
  lifestyle: ["生活", "消费", "旅游", "美食", "汽车", "健康", "时尚", "shopping"],
  education: ["教育", "校园", "高考", "考研", "大学", "学校", "留学", "education"],
};

const TITLE_KEYWORDS: Record<string, string[]> = {
  politics: ["国务院", "外交部", "两会", "关税", "政府", "特朗普", "拜登", "联合国"],
  finance: ["a股", "港股", "美股", "基金", "比特币", "财报", "ipo", "银行", "融资", "经济"],
  tech: ["ai", "人工智能", "大模型", "芯片", "开源", "github", "程序员", "算法", "机器人"],
  society: ["警方", "通报", "事故", "失联", "伤亡", "案件", "曝光", "塌方", "315"],
  entertainment: ["明星", "演员", "电影", "电视剧", "综艺", "演唱会", "票房", "音乐节"],
  anime: ["游戏", "动漫", "原神", "崩铁", "switch", "ps5", "漫画", "番", "动画", "电竞"],
  sports: ["足球", "篮球", "国足", "nba", "cba", "欧冠", "f1", "马拉松", "乒乓", "羽毛球", "比赛"],
  world: ["俄乌", "中东", "美国", "日本", "韩国", "欧洲", "国际", "海外"],
  lifestyle: ["消费", "美食", "旅游", "航运", "车主", "买房", "房价", "健康", "减肥", "咖啡"],
  education: ["高考", "考研", "大学", "校园", "教师", "学生", "中考", "毕业", "教育"],
};

function isCategoryKey(value: string): boolean {
  return value in CATEGORY_NAMES && value !== "all";
}

function labelToKey(label: string): string | null {
  for (const [key, value] of Object.entries(CATEGORY_NAMES)) {
    if (key !== "all" && value === label) {
      return key;
    }
  }
  return null;
}

export function normalizeTopicCategory(input: {
  title?: string;
  category?: string;
  platform?: string;
  normalized_category?: string;
}): string {
  const preset = String(input.normalized_category || "").trim();
  if (preset) {
    if (isCategoryKey(preset)) {
      return preset;
    }
    const mappedKey = labelToKey(preset);
    if (mappedKey) {
      return mappedKey;
    }
  }

  const categoryText = String(input.category || "").toLowerCase();
  const titleText = String(input.title || "").toLowerCase();
  const platformText = String(input.platform || "").toLowerCase();

  for (const [key, hints] of Object.entries(RAW_CATEGORY_HINTS)) {
    if (hints.some((hint) => categoryText.includes(hint.toLowerCase()))) {
      return key;
    }
  }

  for (const [key, hints] of Object.entries(TITLE_KEYWORDS)) {
    if (hints.some((hint) => titleText.includes(hint.toLowerCase()))) {
      return key;
    }
  }

  if (platformText === "github" || platformText === "hackernews") {
    return "tech";
  }
  if (platformText === "bilibili") {
    return "anime";
  }

  return "other";
}
