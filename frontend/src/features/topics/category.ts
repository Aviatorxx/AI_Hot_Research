import { CATEGORY_NAMES } from "@/shared/config/constants";

const RAW_CATEGORY_HINTS: Record<string, string[]> = {
  politics: ["时政", "政治", "政策", "政府", "外交", "军情", "两会", "国际政治", "政务", "法治中国"],
  finance: ["财经", "经济", "金融", "商业", "投资", "股票", "基金", "证券", "银行", "business", "finance", "产业", "贸易", "航运", "楼市", "房产"],
  tech: ["科技", "数码", "互联网", "软件", "开源", "模型", "github", "hacker news", "tech", "programming", "ai", "编程", "开发"],
  society: ["社会", "民生", "法治", "热点", "新闻", "突发", "事故", "通报", "调查", "曝光", "案件"],
  entertainment: ["娱乐", "文娱", "明星", "影视", "综艺", "音乐", "演唱会", "饭圈", "票房", "艺人"],
  anime: ["动漫", "游戏", "二次元", "番剧", "漫画", "电竞", "gaming", "anime", "手游", "主机", "galgame"],
  sports: ["体育", "足球", "篮球", "f1", "奥运", "比赛", "sports", "田径", "网球", "羽毛球"],
  world: ["国际", "海外", "全球", "world", "international", "美国", "日本", "韩国", "欧洲", "中东"],
  lifestyle: ["生活", "消费", "旅游", "美食", "汽车", "健康", "时尚", "shopping", "家居", "母婴", "餐饮", "职场"],
  education: ["教育", "校园", "高考", "考研", "大学", "学校", "留学", "education", "中考", "教师", "学生"],
};

const TITLE_KEYWORDS: Record<string, string[]> = {
  politics: ["国务院", "外交部", "两会", "关税", "政府", "联合国", "国防部", "白宫", "外交", "政策", "制裁", "会晤", "李强", "习近平"],
  finance: ["a股", "港股", "美股", "基金", "比特币", "财报", "ipo", "银行", "融资", "经济", "股价", "金价", "房价", "楼市", "航运", "关税", "消费券"],
  tech: ["ai", "人工智能", "大模型", "芯片", "开源", "github", "程序员", "算法", "机器人", "deepseek", "openai", "模型", "代码", "python", "java", "苹果发布会"],
  society: ["警方", "通报", "事故", "失联", "伤亡", "案件", "曝光", "塌方", "315", "维权", "打假", "执法", "火灾", "灾害", "走失"],
  entertainment: ["明星", "演员", "电影", "电视剧", "综艺", "演唱会", "票房", "音乐节", "恋情", "塌房", "官宣", "艺人", "男团", "女团"],
  anime: ["游戏", "动漫", "原神", "崩铁", "绝区零", "switch", "ps5", "漫画", "番", "动画", "电竞", "ep", "预下载", "卡牌", "二游"],
  sports: ["足球", "篮球", "国足", "nba", "cba", "欧冠", "f1", "马拉松", "乒乓", "羽毛球", "比赛", "联赛", "夺冠", "主场", "球员"],
  world: ["俄乌", "中东", "美国", "日本", "韩国", "欧洲", "国际", "海外", "特朗普", "拜登", "泽连斯基", "以色列", "加沙"],
  lifestyle: ["消费", "美食", "旅游", "车主", "买房", "房价", "健康", "减肥", "咖啡", "奶茶", "奢侈品", "护肤", "餐饮", "出行", "手机套餐", "隐形收费"],
  education: ["高考", "考研", "大学", "校园", "教师", "学生", "中考", "毕业", "教育", "保研", "复试", "高校", "校招", "留学"],
};

const PLATFORM_PRIORS: Record<string, Partial<Record<string, number>>> = {
  github: { tech: 8 },
  hackernews: { tech: 8 },
  bilibili: { anime: 4, entertainment: 2 },
};

const CATEGORY_PRIORITY = [
  "tech",
  "society",
  "finance",
  "politics",
  "entertainment",
  "anime",
  "sports",
  "world",
  "lifestyle",
  "education",
  "other",
] as const;

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
  const scores: Record<string, number> = {};

  for (const [key, weight] of Object.entries(PLATFORM_PRIORS[platformText] || {})) {
    scores[key] = (scores[key] || 0) + (weight || 0);
  }

  for (const [key, hints] of Object.entries(RAW_CATEGORY_HINTS)) {
    const matched = hints.filter((hint) => categoryText.includes(hint.toLowerCase())).length;
    if (matched > 0) {
      scores[key] = (scores[key] || 0) + matched * 4;
    }
  }

  for (const [key, hints] of Object.entries(TITLE_KEYWORDS)) {
    const matched = hints.filter((hint) => titleText.includes(hint.toLowerCase())).length;
    if (matched > 0) {
      scores[key] = (scores[key] || 0) + matched * 2;
    }
  }

  let bestKey = "other";
  let bestScore = 0;
  for (const key of CATEGORY_PRIORITY) {
    const score = scores[key] || 0;
    if (score > bestScore) {
      bestKey = key;
      bestScore = score;
    }
  }

  return bestScore > 0 ? bestKey : "other";
}
