import { preferencesStore } from "@/features/preferences/preferences.store";
import { authStore } from "@/features/auth/auth.store";
import { recommendationsStore } from "@/features/recommendations/recommendations.store";
import { topicsStore } from "@/features/topics/topics.store";
import {
  addPreferenceKeyword,
  removePreferenceKeyword,
  removePreferenceLike,
} from "@/features/preferences/preferences.service";
import { loadRecommendations } from "@/features/recommendations/recommendations.service";
import { loadExternalFeed } from "@/features/feed/feed.service";
import { feedStore } from "@/features/feed/feed.store";
import { loadChatSessionsState } from "@/features/chat/chat.service";
import { PLATFORM_NAMES } from "@/shared/config/constants";
import { escapeHtml, escapeAttr } from "@/shared/lib/format";
import { pushToast } from "@/shared/components/toast/toast";
import { openModalDialog } from "@/shared/components/modal/modal";
import { appBus } from "@/app/app-event-bus";
import * as hotFeed from "@/app/hot-feed.coordinator";
import {
  activateDiscoverPane,
  renderMineChatHistory,
  renderMineExternalFeed,
  renderMineExternalFeedStatus,
  renderMinePage,
  renderMineRecommendations,
  renderMineRecommendationsLoading,
} from "@/pages/mine/mine.page";
import { renderLikesModalMarkup } from "@/pages/mine/mine.view";

const STOP_WORDS = new Set([
  "for", "the", "and", "with", "from", "that", "this", "your", "you",
  "are", "was", "have", "has", "not", "but", "its", "our", "any", "all",
  "can", "will", "more", "into", "also", "when", "then", "than", "their",
  "they", "been", "being", "make", "use", "used", "new", "one", "get",
  "how", "just", "over", "some", "other", "what", "which",
]);

let activeDiscoverTab: "hot" | "ext" = "hot";
let activeManagementSection: "keywords" | "platforms" | "saved" | "history" | null = null;
let lastRelatedCount = 0;

function rerenderMineWorkspace(): void {
  if (hotFeed.getCurrentPlatform() !== "mine") return;
  renderMyPage(topicsStore.getState().platforms);
}

function cleanKeywordCandidate(input: string): string {
  return String(input || "")
    .replace(/[“”"'"'‘’【】[\]（）()]/g, " ")
    .replace(/[#@]/g, "")
    .replace(/\d+(克|斤|元|万|岁|%|倍|天|年|月|小时|分钟)/g, "")
    .replace(/^(关于|有关|针对|这些|这个|那种)/, "")
    .replace(/^旧/, "")
    .replace(/(话题|热搜|热点|新闻|事件|现象|趋势|解读|回应)$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sliceMeaningfulChunk(text: string, fromEnd = false): string {
  const chars = [...cleanKeywordCandidate(text)];
  if (chars.length <= 6) return chars.join("");
  return fromEnd
    ? chars.slice(Math.max(0, chars.length - 4)).join("")
    : chars.slice(0, 6).join("");
}

export function deriveSubscriptionKeyword(title: string, reason = ""): string {
  const sourceReason = cleanKeywordCandidate(reason);
  if (sourceReason && !/(结合|话题|趋势|动态|关注)$/.test(sourceReason)) {
    const parts = sourceReason
      .split(/与|和|及|并|、|\/|·/)
      .map((part) => cleanKeywordCandidate(part))
      .filter(Boolean);
    const picked = parts.find((part) => [...part].length >= 3 && [...part].length <= 8);
    if (picked) return picked;
    const shortened = sliceMeaningfulChunk(sourceReason);
    if (shortened) return shortened;
  }

  const rawTitle = String(title || "").trim();
  const investigateMatch = rawTitle.match(/^\d{2,4}调查(.{2,8}?)(到底|有多|为何|为啥|怎么|多少|$)/);
  if (investigateMatch) {
    return cleanKeywordCandidate(investigateMatch[1]);
  }

  const acronymMatch = rawTitle.match(/[A-Za-z]{2,6}/);
  if (acronymMatch) {
    return acronymMatch[0].toUpperCase();
  }

  const actionMatch = rawTitle.match(
    /^(.{2,12}?)(置换|落户|喊价|假结婚|选座|掌握|解读|回应|发布|涨价|降价|曝光|召回|整改|停售|开售)/,
  );
  if (actionMatch) {
    const stem = cleanKeywordCandidate(actionMatch[1]);
    const shortened = sliceMeaningfulChunk(stem, true);
    if (shortened) return shortened;
  }

  const titleParts = rawTitle
    .split(/与|和|及|并|、|，|\/|·/)
    .map((part) => cleanKeywordCandidate(part))
    .filter(Boolean);
  const direct = titleParts.find((part) => [...part].length >= 2 && [...part].length <= 8);
  if (direct) return direct;

  return sliceMeaningfulChunk(rawTitle, true) || rawTitle;
}

function getRelatedTopics(allTopics: Record<string, any[]>): any[] {
  const { likes, keywords } = preferencesStore.getState();
  const allowedPlatforms = new Set(hotFeed.getVisiblePlatformIds());

  const terms = new Set<string>();
  for (const keyword of keywords) {
    if (keyword.value && keyword.value.trim()) {
      terms.add(keyword.value.trim().toLowerCase());
    }
  }

  for (const title of Object.keys(likes)) {
    const cjk = title.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    const latin = title.match(/[a-zA-Z]{4,}/g) || [];
    for (const word of cjk) terms.add(word.toLowerCase());
    for (const word of latin) {
      const normalized = word.toLowerCase();
      if (!STOP_WORDS.has(normalized)) {
        terms.add(normalized);
      }
    }
  }

  if (terms.size === 0) return [];

  const seen = new Set<string>();
  const liked = new Set(Object.keys(likes));
  const results: any[] = [];

  for (const [platform, topics] of Object.entries(allTopics)) {
    if (!allowedPlatforms.has(platform)) continue;
    for (const topic of topics || []) {
      if (liked.has(topic.title) || seen.has(topic.title)) continue;
      const lower = topic.title.toLowerCase();
      let matchedTerm: string | null = null;
      for (const term of terms) {
        if (lower.includes(term)) {
          matchedTerm = term;
          break;
        }
      }
      if (matchedTerm) {
        seen.add(topic.title);
        results.push({ ...topic, platform, matchedTerm });
      }
    }
  }

  return results.slice(0, 40);
}

export function renderKeywordTags(): void {
  const container = document.getElementById("keywordTagsContainer");
  if (!container) return;
  const { keywords } = preferencesStore.getState();
  if (keywords.length === 0) {
    container.innerHTML =
      '<span style="font-size:12px;color:var(--text-muted)">暂无关键词，添加后可获取相关新闻</span>';
    return;
  }

  container.innerHTML = keywords
    .map(
      (keyword) => `
        <span class="keyword-tag">
          ${escapeHtml(keyword.value)}
          <button class="keyword-tag-remove" data-action="removeKeyword" data-id="${keyword.id}" title="删除">×</button>
        </span>`,
    )
    .join("");
}

export function renderMyPage(allTopics: Record<string, any[]>): void {
  const container = document.getElementById("topicListContainer");
  if (!container) return;
  const { likes, keywords } = preferencesStore.getState();
  const { currentUser } = authStore.getState();
  const related = getRelatedTopics(allTopics);
  lastRelatedCount = related.length;
  const discoverTab =
    activeDiscoverTab === "ext" && keywords.length > 0 ? "ext" : "hot";
  activeDiscoverTab = discoverTab;

  renderMinePage({
    container,
    countElement: document.getElementById("topicCount"),
    likes: Object.entries(likes),
    related,
    keywords,
    hasCurrentUser: Boolean(currentUser),
    platformNames: PLATFORM_NAMES,
    visiblePlatformIds: hotFeed.getVisiblePlatformIds(),
    activeDiscoverTab: discoverTab,
    activeManagementSection,
    escapeHtml,
    escapeAttr,
  });

  renderKeywordTags();
  if (discoverTab === "ext") {
    void loadExternalFeedContent();
  }
  if (currentUser && activeManagementSection === "history") {
    void loadChatSessionsForMine();
  }
  renderRecommendationsPanel();
}

export function renderRecommendationsPanel(): void {
  const aiContainer = document.getElementById("aiPanelContainer");
  if (!aiContainer) return;
  const data = recommendationsStore.getState().data;
  const { likes, keywords } = preferencesStore.getState();
  renderMineRecommendations({
    aiContainer,
    data,
    prefixHtml: hotFeed.getAnalysisJobTrayHtml(),
    hasTerms: keywords.length > 0 || Object.keys(likes).length > 0,
    statusSummary: {
      likesCount: Object.keys(likes).length,
      keywordsCount: keywords.length,
      relatedCount: lastRelatedCount,
    },
    platformNames: PLATFORM_NAMES,
    escapeHtml,
    escapeAttr,
  });
}

async function loadChatSessionsForMine(): Promise<void> {
  const container = document.getElementById("chatHistoryList");
  if (!container) return;
  const { token } = authStore.getState();
  if (!token) return;
  try {
    const sessions = await loadChatSessionsState();
    renderMineChatHistory({
      container,
      sessions: sessions || [],
      escapeHtml,
      escapeAttr,
    });
  } catch {
    container.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">加载失败</div>';
  }
}

export function focusKeywordInput(message?: string): void {
  activeManagementSection = "keywords";
  if (hotFeed.getCurrentPlatform() !== "mine") {
    hotFeed.switchPlatform("mine");
  } else {
    rerenderMineWorkspace();
  }
  window.requestAnimationFrame(() => {
    const input = document.getElementById("keywordInput") as HTMLInputElement | null;
    const section = document.getElementById("mineManagementPanel");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    section?.classList.add("section-spotlight");
    window.setTimeout(() => section?.classList.remove("section-spotlight"), 1800);
    input?.focus();
    input?.select?.();
    if (message) {
      pushToast({ message, type: "info" });
    }
  });
}

export function openRelatedHotSection(options: { silent?: boolean } = {}): void {
  if (hotFeed.getCurrentPlatform() !== "mine") {
    hotFeed.switchPlatform("mine");
  }
  activeDiscoverTab = "hot";
  window.requestAnimationFrame(() => {
    const section = document.getElementById("myDiscoverSection");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    section?.classList.add("section-spotlight");
    window.setTimeout(() => section?.classList.remove("section-spotlight"), 1800);
    activateDiscoverPane({ tab: "hot" });
    if (!options.silent) {
      pushToast({ message: "已定位到热榜相关情报区", type: "info" });
    }
  });
}

export function openPreferencesSection(
  section: "keywords" | "platforms" | "saved" | "history",
): void {
  activeManagementSection =
    activeManagementSection === section ? null : section;
  if (hotFeed.getCurrentPlatform() !== "mine") {
    hotFeed.switchPlatform("mine");
  } else {
    rerenderMineWorkspace();
  }
  window.requestAnimationFrame(() => {
    const panel = document.getElementById("mineManagementPanel");
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
    panel?.classList.add("section-spotlight");
    window.setTimeout(() => panel?.classList.remove("section-spotlight"), 1800);
  });
  if (activeManagementSection === "history" && authStore.getState().currentUser) {
    void loadChatSessionsForMine();
  }
}

export async function addKeyword(keywordOverride?: string): Promise<void> {
  const input = document.getElementById("keywordInput") as HTMLInputElement | null;
  const keyword = (keywordOverride ?? input?.value ?? "").trim();
  if (!keyword) return;
  if (input && !keywordOverride) input.value = "";
  const exists = preferencesStore
    .getState()
    .keywords.some((item) => item.value.toLowerCase() === keyword.toLowerCase());
  if (exists) {
    pushToast({ message: `关键词「${keyword}」已在关注列表中`, type: "info" });
    return;
  }

  try {
    await addPreferenceKeyword(keyword);
    activeDiscoverTab = "hot";
    activeManagementSection = "keywords";
    appBus.emit("ui:update", undefined);
    pushToast({ message: `已添加关键词「${keyword}」`, type: "success" });
  } catch (error: any) {
    pushToast({ message: `添加失败: ${error.message}`, type: "error" });
  }
}

export async function addRecommendedKeyword(title: string, reason = ""): Promise<void> {
  const keyword = deriveSubscriptionKeyword(title, reason);
  await addKeyword(keyword);
  focusKeywordInput(`已将关键词「${keyword}」加入关注方向`);
}

export async function removeKeyword(id: number): Promise<void> {
  try {
    await removePreferenceKeyword(id);
    activeManagementSection = "keywords";
    appBus.emit("ui:update", undefined);
  } catch {
    pushToast({ message: "删除关键词失败", type: "error" });
  }
}

export function showLikesModal(): void {
  activeManagementSection = "saved";
  const { likes } = preferencesStore.getState();
  const likeEntries = Object.entries(likes);
  openModalDialog({
    title: `❤️ 已收藏话题（${likeEntries.length}）`,
    bodyHtml: renderLikesModalMarkup({
      likes: likeEntries,
      platformNames: PLATFORM_NAMES,
      escapeHtml,
      escapeAttr,
    }),
  });
}

export async function fetchRecommendations(): Promise<void> {
  const aiContainer = document.getElementById("aiPanelContainer");
  if (!aiContainer) return;
  renderMineRecommendationsLoading(aiContainer);

  try {
    await loadRecommendations();
    renderRecommendationsPanel();
    pushToast({ message: "个性化推荐已生成", type: "success" });
  } catch (error: any) {
    const { likes, keywords } = preferencesStore.getState();
    renderMineRecommendations({
      aiContainer,
      data: null,
      prefixHtml: hotFeed.getAnalysisJobTrayHtml(),
      hasTerms: keywords.length > 0 || Object.keys(likes).length > 0,
      statusSummary: {
        likesCount: Object.keys(likes).length,
        keywordsCount: keywords.length,
        relatedCount: lastRelatedCount,
      },
      platformNames: PLATFORM_NAMES,
      escapeHtml,
      escapeAttr,
    });
    pushToast({ message: `推荐失败: ${error.message}`, type: "error" });
  }
}

export async function deleteLikeAndRefresh(title: string): Promise<void> {
  try {
    await removePreferenceLike(title);
    appBus.emit("ui:update", undefined);
    const { likes } = preferencesStore.getState();
    const likeEntries = Object.entries(likes);
    const modalOverlay = document.getElementById("modalOverlay");
    const modalTitle = document.getElementById("modalTitle");
    if (
      modalOverlay?.classList.contains("active") &&
      modalTitle?.textContent?.startsWith("❤️")
    ) {
      openModalDialog({
        title: `❤️ 已收藏话题（${likeEntries.length}）`,
        bodyHtml: renderLikesModalMarkup({
          likes: likeEntries,
          platformNames: PLATFORM_NAMES,
          escapeHtml,
          escapeAttr,
        }),
      });
    }
  } catch {
    pushToast({ message: "取消收藏失败", type: "error" });
  }
}

export function switchDiscoverTab(
  tab: "hot" | "ext",
  trigger?: HTMLElement | null,
  options: { silent?: boolean } = {},
): void {
  activeDiscoverTab = tab;
  activateDiscoverPane({ tab, trigger: trigger || null });
  if (tab === "ext") {
    void loadExternalFeedContent();
  }
  if (!options.silent) {
    pushToast({
      message: tab === "hot" ? "已切换到热榜相关" : "已切换到外部新闻",
      type: "info",
    });
  }
}

async function loadExternalFeedContent(): Promise<void> {
  const container = document.getElementById("externalFeedContainer");
  if (!container) return;
  if ((container as HTMLElement).dataset.loaded === "1") return;
  (container as HTMLElement).dataset.loaded = "1";

  const { keywords } = preferencesStore.getState();
  try {
    const articles = await loadExternalFeed(keywords.map((item) => item.value));
    const badge = document.getElementById("extNewsCount");
    if (badge) badge.textContent = String(articles.length || 0);
    renderMineExternalFeed({ container, articles, escapeHtml, escapeAttr });
  } catch {
    renderMineExternalFeedStatus({ container, message: "外部新闻加载失败" });
  }
}

export function subscribeFeedStore(): void {
  feedStore.subscribe((state) => {
    const badge = document.getElementById("extNewsCount");
    if (badge && state.articles.length > 0) {
      badge.textContent = String(state.articles.length);
    }
  });
}
