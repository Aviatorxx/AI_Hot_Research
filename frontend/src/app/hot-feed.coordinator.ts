import {
  loadTopics,
  refreshTopics,
} from "@/features/topics/topics.service";
import { topicsStore } from "@/features/topics/topics.store";
import { preferencesStore } from "@/features/preferences/preferences.store";
import { analysisStore } from "@/features/analysis/analysis.store";
import { toggleTopicLike } from "@/features/preferences/preferences.service";
import {
  runAnalysisSummary,
  runTopicAnalysis,
} from "@/features/analysis/analysis.service";
import { buildKeywordMatches } from "@/features/notifications/notifications.service";
import { PLATFORM_NAMES, STORAGE_KEYS } from "@/shared/config/constants";
import { getStoredBoolean } from "@/shared/lib/storage";
import { escapeHtml, escapeAttr, highlightText } from "@/shared/lib/format";
import { pushToast } from "@/shared/components/toast/toast";
import {
  closeModalDialog,
  openModalDialog,
} from "@/shared/components/modal/modal";
import {
  renderHotFeedAnalysisLoading,
  renderHotFeedAnalysisPanel,
  renderHotFeedPage,
  renderTopicAnalysisModal,
} from "@/pages/hot-feed/hot-feed.page";
import { renderAnalysisJobTrayMarkup } from "@/pages/hot-feed/hot-feed.view";
import { renderPlatformTabsMarkup, summarizeDashboard } from "@/app/layout";
import {
  createAutoRefreshController,
  syncAutoRefreshToggle,
  updateCountdownUI,
} from "@/app/refresh";
import {
  emitKeywordNotifications,
  toggleNotifications,
  updateNotifyButton,
} from "@/app/notifications";
import { appBus } from "@/app/app-event-bus";
import type { AggregatedTopic, Topic } from "@/features/topics/topics.types";

const PAGE_SIZE = 20;
const AUTO_REFRESH_INTERVAL = 5 * 60;
const ALL_PLATFORM_IDS = Object.keys(PLATFORM_NAMES);

type FeedMode = "all" | "resonance" | "rising";

interface TopicLookupState {
  requestedTitle: string;
  title: string;
  label: string;
  meta: string;
  status: "matched" | "fallback";
  targetKey: string;
}

let currentPlatform = "mine";
let currentPage = 1;
let searchQuery = "";
let analysisCount = 0;
let notifyEnabled = getStoredBoolean(STORAGE_KEYS.notifyEnabled);
let feedMode: FeedMode = "all";
let activeClusterFilter: string[] | null = null;
let topicLookupState: TopicLookupState | null = null;
const notifiedThisSession = new Set<string>();
let visiblePlatformIds = loadVisiblePlatforms();
type TopicAnalysisJobStatus = "queued" | "running" | "done" | "error";
interface TopicAnalysisJob {
  id: string;
  title: string;
  status: TopicAnalysisJobStatus;
  message: string;
  createdAt: number;
  result: any | null;
  error: string | null;
}
let topicAnalysisJobs: TopicAnalysisJob[] = [];
let selectedAnalysisJobId: string | null = null;

function loadVisiblePlatforms(): string[] {
  const raw = localStorage.getItem(STORAGE_KEYS.visiblePlatforms);
  if (!raw) return [...ALL_PLATFORM_IDS];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...ALL_PLATFORM_IDS];
    const normalized = parsed.filter(
      (id): id is string => typeof id === "string" && ALL_PLATFORM_IDS.includes(id),
    );
    return normalized.length > 0 ? normalized : [...ALL_PLATFORM_IDS];
  } catch {
    return [...ALL_PLATFORM_IDS];
  }
}

function persistVisiblePlatforms(): void {
  localStorage.setItem(STORAGE_KEYS.visiblePlatforms, JSON.stringify(visiblePlatformIds));
}

function getFilteredPlatforms() {
  return Object.fromEntries(
    Object.entries(topicsStore.getState().platforms).filter(([platform]) =>
      visiblePlatformIds.includes(platform),
    ),
  );
}

function getFilteredAggregatedTopics(): AggregatedTopic[] {
  return topicsStore
    .getState()
    .aggregatedTopics
    .map((topic) => {
      const visiblePlatforms = (topic.platforms || []).filter((platform) =>
        visiblePlatformIds.includes(platform),
      );
      const visibleDetails = (topic.platform_details || []).filter((detail) =>
        visiblePlatformIds.includes(detail.platform),
      );
      return {
        ...topic,
        platforms: visiblePlatforms,
        platform_details: visibleDetails,
        platform_count: visiblePlatforms.length,
      };
    })
    .filter((topic) => topic.platform_count > 0);
}

export const autoRefresh = createAutoRefreshController({
  intervalSeconds: AUTO_REFRESH_INTERVAL,
  onRefresh: () => {
    void refreshData();
  },
  onStateChange: ({ enabled, countdown }) => {
    syncAutoRefreshToggle(enabled);
    updateCountdownUI({
      enabled,
      countdown,
      interval: AUTO_REFRESH_INTERVAL,
    });
  },
});

function normalizeTopicTitle(title: string): string {
  return String(title || "")
    .toLowerCase()
    .replace(/[\s\-_/\\|:：,.，。！？!?"'“”‘’（）()[\]【】<>《》·]+/g, "")
    .trim();
}

function extractTopicTerms(title: string): string[] {
  const raw = String(title || "").toLowerCase();
  const terms = new Set<string>();
  (raw.match(/[\u4e00-\u9fa5]{2,}/g) || []).forEach((item) => terms.add(item));
  (raw.match(/[a-z0-9]{2,}/g) || []).forEach((item) => terms.add(item));
  return [...terms];
}

function buildTopicLookupKey(topic: AggregatedTopic | (Topic & { platform?: string }), platformOverride?: string): string {
  const platforms = "platforms" in topic ? (topic.platforms || []) : [];
  if (platforms.length > 0) {
    return `agg:${normalizeTopicTitle(topic.title)}:${platforms.slice().sort().join(",")}`;
  }
  const rawPlatform = "platform" in topic ? topic.platform : undefined;
  return `raw:${platformOverride || rawPlatform || ""}:${normalizeTopicTitle(topic.title)}`;
}

function scoreTopicMatch(inputTitle: string, candidateTitle: string): { score: number; reason: string } {
  const inputNorm = normalizeTopicTitle(inputTitle);
  const candidateNorm = normalizeTopicTitle(candidateTitle);
  if (!inputNorm || !candidateNorm) {
    return { score: 0, reason: "缺少可比较标题" };
  }
  if (inputNorm === candidateNorm) {
    return { score: 1000, reason: "标题完全一致" };
  }
  if (candidateNorm.includes(inputNorm) || inputNorm.includes(candidateNorm)) {
    return { score: 820, reason: "标题核心片段一致" };
  }

  const inputTerms = extractTopicTerms(inputTitle);
  const candidateTerms = new Set(extractTopicTerms(candidateTitle));
  const overlap = inputTerms.filter((term) => candidateTerms.has(term));
  if (overlap.length === 0) {
    return { score: 0, reason: "没有命中共同关键词" };
  }
  return {
    score: overlap.length * 120 + Math.min(candidateNorm.length, inputNorm.length),
    reason: `命中关键词：${overlap.slice(0, 3).join(" / ")}`,
  };
}

function findBestTopicMatch(title: string, preferredPlatform = "all") {
  const candidates: Array<{
    topic: AggregatedTopic | (Topic & { platform: string });
    viewPlatform: string;
    source: string;
    priority: number;
  }> = [];

  if (preferredPlatform !== "all" && preferredPlatform !== "mine") {
    if (!visiblePlatformIds.includes(preferredPlatform)) {
      preferredPlatform = "all";
    }
    for (const topic of topicsStore.getState().platforms[preferredPlatform] || []) {
      candidates.push({
        topic: { ...topic, platform: preferredPlatform },
        viewPlatform: preferredPlatform,
        source: PLATFORM_NAMES[preferredPlatform] || preferredPlatform,
        priority: 0,
      });
    }
  }

  for (const topic of getFilteredAggregatedTopics()) {
    candidates.push({
      topic,
      viewPlatform: "all",
      source: "全部平台",
      priority: 1,
    });
  }

  let best: {
    topic: AggregatedTopic | (Topic & { platform: string });
    viewPlatform: string;
    source: string;
    score: number;
    reason: string;
    lookupKey: string;
  } | null = null;

  for (const candidate of candidates) {
    const scored = scoreTopicMatch(title, candidate.topic.title);
    if (scored.score <= 0) continue;
    const match = {
      ...candidate,
      score: scored.score - candidate.priority * 5,
      reason: scored.reason,
      lookupKey: buildTopicLookupKey(
        candidate.topic,
        candidate.viewPlatform === "all"
          ? ("platform" in candidate.topic ? candidate.topic.platform : undefined)
          : candidate.viewPlatform,
      ),
    };
    if (!best || match.score > best.score) {
      best = match;
    }
  }

  return best;
}

function getFeedModeMeta(mode: FeedMode = feedMode): {
  label: string;
  title: string;
  meta: string;
} {
  if (mode === "resonance") {
    return {
      label: "共振优先",
      title: "跨平台同时上榜的话题优先显示",
      meta: "按共振平台数和聚合热度排序，先看多平台同时发酵的话题。",
    };
  }
  if (mode === "rising") {
    return {
      label: "上升最快",
      title: "排名上升幅度最大的热点优先显示",
      meta: "优先显示近期涨势最明显的话题，再按聚合热度补充排序。",
    };
  }
  return {
    label: "全部热点",
    title: "当前全平台热点总览",
    meta: "按默认热度顺序查看各平台的最新热点。",
  };
}

function sortAggregatedTopics(topics: AggregatedTopic[]): AggregatedTopic[] {
  const sorted = [...topics];
  if (feedMode === "resonance") {
    sorted.sort(
      (a, b) =>
        (b.platform_count || 0) - (a.platform_count || 0) ||
        (b.aggregate_score || 0) - (a.aggregate_score || 0),
    );
  } else if (feedMode === "rising") {
    sorted.sort((a, b) => {
      const aScore = a.velocity?.direction === "up" ? a.velocity.delta || 0 : -1;
      const bScore = b.velocity?.direction === "up" ? b.velocity.delta || 0 : -1;
      return bScore - aScore || (b.aggregate_score || 0) - (a.aggregate_score || 0);
    });
  }
  return sorted;
}

export function getCurrentPlatform(): string {
  return currentPlatform;
}

export function getFeedMode(): FeedMode {
  return feedMode;
}

function getVisibleTopics(): Array<AggregatedTopic | (Topic & { platform: string })> {
  if (currentPlatform === "all") {
    let topics = sortAggregatedTopics(getFilteredAggregatedTopics());
    if (activeClusterFilter && activeClusterFilter.length > 0) {
      topics = topics.filter((topic) =>
        activeClusterFilter?.some((keyword) =>
          topic.title.toLowerCase().includes(keyword.toLowerCase()),
        ),
      );
    }
    return topics;
  }

  return ((visiblePlatformIds.includes(currentPlatform)
    ? topicsStore.getState().platforms[currentPlatform]
    : []) || []).map((topic) => ({
    ...topic,
    platform: currentPlatform,
  }));
}

function updateFeedModeButtons(): void {
  const modes: FeedMode[] = ["all", "resonance", "rising"];
  for (const mode of modes) {
    document
      .getElementById(`feedMode${mode.charAt(0).toUpperCase()}${mode.slice(1)}`)
      ?.classList.toggle("active", feedMode === mode);
  }
}

function buildFeedContext() {
  if (topicLookupState) {
    return {
      label: topicLookupState.label,
      title: topicLookupState.title,
      meta: topicLookupState.meta,
      clearAction: "clearTopicLookup",
      clearLabel: "恢复全部",
      status: topicLookupState.status,
    };
  }
  if (currentPlatform === "all" && (feedMode !== "all" || (activeClusterFilter?.length || 0) > 0)) {
    const modeMeta = getFeedModeMeta(feedMode);
    const clusterMeta =
      activeClusterFilter && activeClusterFilter.length > 0
        ? `AI 聚焦：${activeClusterFilter.slice(0, 3).join(" / ")}`
        : modeMeta.meta;
    return {
      label: modeMeta.label,
      title: modeMeta.title,
      meta: clusterMeta,
      clearAction: "resetFeedContext",
      clearLabel: "恢复全部",
      clearKeywords: activeClusterFilter?.join("|"),
    };
  }
  return null;
}

export function updateStats(): void {
  const summary = summarizeDashboard({
    allTopics: getFilteredPlatforms(),
    aggregatedTopics: getFilteredAggregatedTopics(),
    updatedAt: topicsStore.getState().updatedAt,
    analysisCount,
  });
  const total = document.getElementById("statTotal");
  const platforms = document.getElementById("statPlatforms");
  const time = document.getElementById("statTime");
  const timeAgo = document.getElementById("statTimeAgo");
  const analyses = document.getElementById("statAnalyses");
  const newTopics = document.getElementById("statNewTopics");
  const resonance = document.getElementById("statResonance");
  const rising = document.getElementById("statRising");
  if (total) total.textContent = String(summary.total);
  if (platforms) platforms.textContent = String(summary.activePlatforms);
  if (time) time.textContent = summary.time;
  if (timeAgo) timeAgo.textContent = `距今 ${summary.timeAgo}`;
  if (analyses) analyses.textContent = String(summary.analysisCount);
  if (newTopics) newTopics.textContent = String(summary.newTopics);
  if (resonance) resonance.textContent = String(summary.resonance);
  if (rising) rising.textContent = String(summary.rising);
}

export function updatePlatformTabs(): void {
  const tabs = document.getElementById("platformTabs");
  if (!tabs) return;
  tabs.innerHTML = renderPlatformTabsMarkup({
    allTopics: getFilteredPlatforms(),
    aggregatedTopics: getFilteredAggregatedTopics(),
    currentPlatform,
    platformNames: PLATFORM_NAMES,
    visiblePlatformIds,
  });
}

export function renderTopics(): void {
  const container = document.getElementById("topicListContainer");
  if (!container) return;
  const { likes, keywords } = preferencesStore.getState();
  currentPage = renderHotFeedPage({
    container,
    countElement: document.getElementById("topicCount"),
    visibleTopics: getVisibleTopics(),
    currentPlatform,
    currentPage,
    pageSize: PAGE_SIZE,
    searchQuery,
    likedTitles: new Set(Object.keys(likes)),
    keywordTerms: keywords.map((item) => item.value.trim().toLowerCase()).filter(Boolean),
    platformNames: PLATFORM_NAMES,
    escapeHtml,
    escapeAttr,
    highlightText,
    feedContext: buildFeedContext(),
  });
  updateFeedModeButtons();
}

export function renderAnalysisPanel(data: any | null): void {
  const container = document.getElementById("aiPanelContainer");
  if (!container) return;
  renderHotFeedAnalysisPanel({
    container,
    data,
    jobs: topicAnalysisJobs.slice(0, 5),
    selectedJobId: selectedAnalysisJobId,
    escapeHtml,
    escapeAttr,
  });
}

export function renderTopicAnalysis(data: any): void {
  const titleElement = document.getElementById("modalTitle");
  const bodyElement = document.getElementById("modalBody");
  if (!titleElement || !bodyElement) return;
  renderTopicAnalysisModal({ titleElement, bodyElement, data, escapeHtml, escapeAttr });
}

function checkKeywordNotifications(oldTitles: Set<string>): void {
  if (
    !notifyEnabled ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }
  const { keywords } = preferencesStore.getState();
  if (keywords.length === 0) return;

  const matches = buildKeywordMatches({
    allTopics: topicsStore.getState().platforms,
    keywords,
    oldTitles,
    notifiedThisSession,
  });

  emitKeywordNotifications({
    matches,
    onToast: (message) => pushToast({ message, type: "info" }),
    onNavigate: ({ platform, keyword }) => {
      if (platform && platform !== currentPlatform) {
        switchPlatform(platform);
      }
      const input = document.getElementById("searchInput") as HTMLInputElement | null;
      if (input) {
        input.value = keyword;
        onSearchInput(keyword);
      }
    },
  });
}

export async function refreshData(): Promise<void> {
  const btn = document.getElementById("btnRefresh");
  btn?.classList.add("loading");

  try {
    const oldTitles = new Set<string>();
    for (const topics of Object.values(topicsStore.getState().platforms)) {
      for (const topic of topics || []) oldTitles.add(topic.title);
    }

    await refreshTopics();
    appBus.emit("ui:update", undefined);
    pushToast({ message: "数据已更新", type: "success" });
    autoRefresh.start();
    checkKeywordNotifications(oldTitles);
  } catch (error: any) {
    pushToast({ message: `获取数据失败: ${error.message}`, type: "error" });
  } finally {
    btn?.classList.remove("loading");
  }
}

export async function loadInitialTopics(): Promise<void> {
  try {
    await loadTopics();
    appBus.emit("ui:update", undefined);
  } catch (error: any) {
    if (Object.keys(topicsStore.getState().platforms).length === 0) {
      pushToast({ message: `获取热点数据失败: ${error.message}`, type: "error" });
    }
  }
}

export async function toggleLike(
  element: HTMLElement,
  title: string,
  platform: string,
  url: string,
): Promise<void> {
  const wasLiked = Boolean(preferencesStore.getState().likes[title]);
  try {
    await toggleTopicLike({ title, platform, url });
  } catch {
    pushToast({ message: "收藏操作失败", type: "error" });
    return;
  }

  element.classList.toggle("liked", !wasLiked);
  element.title = !wasLiked ? "取消收藏" : "收藏";
  const svg = element.querySelector("svg");
  if (svg) {
    svg.setAttribute("fill", !wasLiked ? "currentColor" : "none");
  }
  updatePlatformTabs();
}

export async function runAiAnalysis(): Promise<void> {
  const btn = document.getElementById("btnAnalyze");
  const container = document.getElementById("aiPanelContainer");
  const startedPlatform = currentPlatform;
  btn?.classList.add("loading");
  if (container) renderHotFeedAnalysisLoading(container);

  try {
    const data = await runAnalysisSummary();
    analysisCount += 1;
    updateStats();
    if (currentPlatform === startedPlatform && currentPlatform !== "mine") {
      renderAnalysisPanel(data);
    }
    pushToast({ message: "AI 分析完成", type: "success" });
  } catch (error: any) {
    if (container && currentPlatform === startedPlatform && currentPlatform !== "mine") {
      container.innerHTML = `<div class="ai-placeholder"><p style="color:var(--neon-red)">${escapeHtml(error.message)}</p></div>`;
    }
    pushToast({ message: `AI 分析失败: ${error.message}`, type: "error" });
  } finally {
    btn?.classList.remove("loading");
  }
}

export async function analyzeTopic(title: string): Promise<void> {
  createTopicAnalysisJob(title);
}

export function closeModal(): void {
  closeModalDialog();
}

export function goToPage(page: number): void {
  const topics = getVisibleTopics();
  const totalPages = Math.ceil(topics.length / PAGE_SIZE);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderTopics();
  document.getElementById("topicListContainer")?.scrollTo({ top: 0 });
}

function resetSearchState(): void {
  searchQuery = "";
  const input = document.getElementById("searchInput") as HTMLInputElement | null;
  if (input) input.value = "";
  document.getElementById("searchWrap")?.classList.remove("has-value");
}

export function onSearchInput(value: string): void {
  searchQuery = value.trim();
  document
    .getElementById("searchWrap")
    ?.classList.toggle("has-value", searchQuery.length > 0);
  currentPage = 1;
  renderTopics();
}

export function clearSearch(): void {
  resetSearchState();
  currentPage = 1;
  renderTopics();
}

export function switchPlatform(
  platform: string,
  options: {
    preserveSearch?: boolean;
    preserveCluster?: boolean;
    preserveLookup?: boolean;
  } = {},
): void {
  if (platform !== "all" && platform !== "mine" && !visiblePlatformIds.includes(platform)) {
    platform = "all";
  }
  currentPlatform = platform;
  currentPage = 1;
  if (!options.preserveCluster) {
    activeClusterFilter = null;
  }
  if (!options.preserveLookup) {
    topicLookupState = null;
  }
  if (!options.preserveSearch && searchQuery) {
    resetSearchState();
  }
  appBus.emit("ui:update", undefined);
}

export function getVisiblePlatformIds(): string[] {
  return [...visiblePlatformIds];
}

export function togglePlatformVisibility(platform: string): void {
  if (!ALL_PLATFORM_IDS.includes(platform)) return;
  const currentlyVisible = visiblePlatformIds.includes(platform);
  if (currentlyVisible && visiblePlatformIds.length === 1) {
    pushToast({ message: "至少保留一个平台用于展示", type: "info" });
    return;
  }

  visiblePlatformIds = currentlyVisible
    ? visiblePlatformIds.filter((item) => item !== platform)
    : [...visiblePlatformIds, platform];
  persistVisiblePlatforms();

  if (currentPlatform !== "all" && currentPlatform !== "mine" && !visiblePlatformIds.includes(currentPlatform)) {
    currentPlatform = "all";
  }

  appBus.emit("ui:update", undefined);
}

export function setFeedMode(mode: FeedMode): void {
  if (currentPlatform === "mine") {
    openFeedMode(mode);
    return;
  }
  feedMode = mode;
  currentPage = 1;
  topicLookupState = null;
  renderTopics();
}

export function openFeedMode(
  mode: FeedMode,
  options: {
    preserveCluster?: boolean;
    preserveSearch?: boolean;
    preserveLookup?: boolean;
    silent?: boolean;
  } = {},
): void {
  feedMode = mode;
  currentPage = 1;
  if (!options.preserveCluster) activeClusterFilter = null;
  if (!options.preserveLookup) topicLookupState = null;
  switchPlatform("all", {
    preserveCluster: true,
    preserveLookup: true,
    preserveSearch: options.preserveSearch,
  });
  document.getElementById("topicListContainer")?.scrollTo({ top: 0 });
  if (!options.silent) {
    pushToast({ message: `已切换到${getFeedModeMeta(mode).label}`, type: "info" });
  }
}

export function focusCluster(rawKeywords: string): void {
  activeClusterFilter = rawKeywords
    .split("|")
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
  topicLookupState = null;
  openFeedMode(feedMode === "all" ? "all" : feedMode, {
    preserveCluster: true,
    preserveSearch: true,
    preserveLookup: true,
    silent: true,
  });
}

export function resetFeedContext(): void {
  activeClusterFilter = null;
  feedMode = "all";
  currentPage = 1;
  topicLookupState = null;
  if (currentPlatform !== "all") {
    switchPlatform("all", {
      preserveCluster: true,
      preserveLookup: true,
    });
  } else {
    renderTopics();
  }
  document.getElementById("topicListContainer")?.scrollTo({ top: 0 });
  pushToast({ message: "已恢复全部热点视图", type: "info" });
}

export function clearTopicLookup(): void {
  topicLookupState = null;
  renderTopics();
}

export function openTopicInFeed(title: string, preferredPlatform = "all"): void {
  const match = findBestTopicMatch(title, preferredPlatform);
  if (!match) {
    searchQuery = title;
    const input = document.getElementById("searchInput") as HTMLInputElement | null;
    if (input) input.value = title;
    openFeedMode("all", { preserveSearch: true, silent: true });
    renderTopics();
    return;
  }

  topicLookupState = {
    requestedTitle: title,
    title: match.topic.title,
    label: "定位到相关热榜",
    meta: `${match.source} · ${match.reason}`,
    status: match.score >= 820 ? "matched" : "fallback",
    targetKey: match.lookupKey,
  };

  if (match.viewPlatform === "all") {
    openFeedMode("all", { preserveLookup: true, preserveSearch: false, silent: true });
  } else {
    switchPlatform(match.viewPlatform, { preserveLookup: true });
  }
}

function refreshInsightsPanel(): void {
  if (currentPlatform === "mine") {
    appBus.emit("ui:update", undefined);
    return;
  }
  renderAnalysisPanel(analysisStore.getState().summary);
}

function createTopicAnalysisJob(title: string): void {
  const existing = topicAnalysisJobs.find(
    (job) => job.title === title && (job.status === "queued" || job.status === "running"),
  );
  if (existing) {
    selectedAnalysisJobId = existing.id;
    refreshInsightsPanel();
    pushToast({ message: "该话题已在后台分析中", type: "info" });
    return;
  }

  const job: TopicAnalysisJob = {
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    status: "queued",
    message: "等待开始",
    createdAt: Date.now(),
    result: null,
    error: null,
  };
  topicAnalysisJobs = [job, ...topicAnalysisJobs].slice(0, 5);
  selectedAnalysisJobId = job.id;
  refreshInsightsPanel();
  void runTopicAnalysisJob(job.id);
}

async function runTopicAnalysisJob(jobId: string): Promise<void> {
  const job = topicAnalysisJobs.find((item) => item.id === jobId);
  if (!job) return;
  job.status = "running";
  job.message = "AI 正在处理中";
  job.error = null;
  refreshInsightsPanel();

  try {
    const data = await runTopicAnalysis(job.title);
    job.status = "done";
    job.message = "分析完成，可随时查看";
    job.result = data;
    analysisCount += 1;
    updateStats();
    refreshInsightsPanel();
    pushToast({ message: `「${job.title}」分析完成`, type: "success" });
  } catch (error: any) {
    job.status = "error";
    job.error = error.message || "分析失败";
    job.message = job.error || "分析失败";
    refreshInsightsPanel();
    pushToast({ message: `「${job.title}」分析失败`, type: "error" });
  }
}

export function openTopicAnalysisJob(jobId: string): void {
  const job = topicAnalysisJobs.find((item) => item.id === jobId);
  if (!job) return;
  selectedAnalysisJobId = job.id;
  if (job.status !== "done" || !job.result) {
    pushToast({ message: "分析尚未完成，请稍后查看", type: "info" });
    refreshInsightsPanel();
    return;
  }
  openModalDialog({
    title: job.result.title || job.title,
    bodyHtml: "",
  });
  renderTopicAnalysis(job.result);
}

export function retryTopicAnalysisJob(jobId: string): void {
  const job = topicAnalysisJobs.find((item) => item.id === jobId);
  if (!job) return;
  job.status = "queued";
  job.message = "重新加入分析队列";
  job.result = null;
  job.error = null;
  selectedAnalysisJobId = job.id;
  refreshInsightsPanel();
  void runTopicAnalysisJob(job.id);
}

export function hasTopicAnalysisJobs(): boolean {
  return topicAnalysisJobs.length > 0;
}

export function getAnalysisJobTrayHtml(): string {
  return renderAnalysisJobTrayMarkup({
    jobs: topicAnalysisJobs.slice(0, 5),
    selectedJobId: selectedAnalysisJobId,
    escapeHtml,
    escapeAttr,
  });
}

export function toggleAutoRefresh(): void {
  const enabled = autoRefresh.toggle();
  pushToast({
    message: enabled ? "自动刷新已开启（每5分钟）" : "自动刷新已关闭",
    type: enabled ? "success" : "info",
  });
}

export async function toggleNotify(): Promise<void> {
  notifyEnabled = await toggleNotifications({
    enabled: notifyEnabled,
    onError: (message) => pushToast({ message, type: "error" }),
    onSuccess: (message, type) => pushToast({ message, type }),
  });
  updateNotifyButton(notifyEnabled);
}

export function initNotifyButton(): void {
  updateNotifyButton(notifyEnabled);
}

export function subscribeAnalysisStore(): void {
  analysisStore.subscribe((state) => {
    if (currentPlatform !== "mine") {
      renderAnalysisPanel(state.summary);
    }
  });
}
