import {
  renderChatHistoryMarkup,
  renderMinePageMarkup,
  renderRecommendationChatMarkup,
  renderRecommendationsPanelMarkup,
} from "@/pages/mine/mine.view";
import type { FeedArticle } from "@/features/feed/feed.types";
import type { ChatMessage } from "@/features/chat/chat.types";
import type { RecommendationResult } from "@/features/recommendations/recommendations.types";

type MineRenderOptions = Parameters<typeof renderMinePageMarkup>[0];
type ChatHistoryRenderOptions = Parameters<typeof renderChatHistoryMarkup>[0];
type RecommendationChatRenderOptions = Parameters<
  typeof renderRecommendationChatMarkup
>[0];

export function renderMinePage(options: {
  container: HTMLElement;
  countElement: HTMLElement | null;
  likes: MineRenderOptions["likes"];
  related: MineRenderOptions["related"];
  keywords: MineRenderOptions["keywords"];
  hasCurrentUser: MineRenderOptions["hasCurrentUser"];
  platformNames: MineRenderOptions["platformNames"];
  visiblePlatformIds: MineRenderOptions["visiblePlatformIds"];
  activeDiscoverTab: MineRenderOptions["activeDiscoverTab"];
  escapeHtml: MineRenderOptions["escapeHtml"];
  escapeAttr: MineRenderOptions["escapeAttr"];
}): void {
  const {
    container,
    countElement,
    likes,
    related,
    keywords,
    hasCurrentUser,
    platformNames,
    visiblePlatformIds,
    activeDiscoverTab,
    escapeHtml,
    escapeAttr,
  } = options;

  if (countElement) {
    countElement.textContent = `${likes.length} saved · ${related.length} related`;
  }

  container.innerHTML = renderMinePageMarkup({
    likes,
    related,
    keywords,
    hasCurrentUser,
    platformNames,
    visiblePlatformIds,
    activeDiscoverTab,
    escapeHtml,
    escapeAttr,
  });
}

export function renderMineChatHistory(options: {
  container: HTMLElement;
  sessions: ChatHistoryRenderOptions["sessions"];
  escapeHtml: ChatHistoryRenderOptions["escapeHtml"];
  escapeAttr: ChatHistoryRenderOptions["escapeAttr"];
}): void {
  const { container, sessions, escapeHtml, escapeAttr } = options;

  container.innerHTML = renderChatHistoryMarkup({
    sessions,
    escapeHtml,
    escapeAttr,
  });
}

export function renderMineRecommendations(options: {
  aiContainer: HTMLElement;
  chatMessages: HTMLElement | null;
  data: RecommendationResult | null;
  prefixHtml?: string;
  hasTerms: boolean;
  statusSummary: Parameters<typeof renderRecommendationsPanelMarkup>[0]["statusSummary"];
  platformNames: Parameters<typeof renderRecommendationsPanelMarkup>[0]["platformNames"];
  escapeHtml: Parameters<typeof renderRecommendationsPanelMarkup>[0]["escapeHtml"];
  escapeAttr: Parameters<typeof renderRecommendationsPanelMarkup>[0]["escapeAttr"];
  formatChatText: RecommendationChatRenderOptions["formatChatText"];
}): void {
  const {
    aiContainer,
    chatMessages,
    data,
    prefixHtml,
    hasTerms,
    statusSummary,
    platformNames,
    escapeHtml,
    escapeAttr,
    formatChatText,
  } = options;

  aiContainer.innerHTML = renderRecommendationsPanelMarkup({
    data,
    prefixHtml,
    hasTerms,
    statusSummary,
    platformNames,
    escapeHtml,
    escapeAttr,
  });

  if (chatMessages && data) {
    chatMessages.innerHTML = renderRecommendationChatMarkup({
      report: data.report,
      articles: data.fetched_articles,
      formatChatText,
      escapeAttr,
      escapeHtml,
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

export function renderMineRecommendationsLoading(
  aiContainer: HTMLElement,
): void {
  aiContainer.innerHTML =
    '<div class="loading-skeleton"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></div>';
}

export function renderMineExternalFeed(options: {
  container: HTMLElement;
  articles: FeedArticle[];
  escapeHtml: (value: string) => string;
  escapeAttr: (value: string) => string;
}): void {
  const { container, articles, escapeHtml, escapeAttr } = options;

  if (articles.length === 0) {
    container.innerHTML =
      '<div style="font-size:12px;color:var(--text-muted);padding:4px 0">暂无相关外部新闻</div>';
    return;
  }

  let html = '<div class="articles-list">';
  for (const article of articles) {
    html += `<a class="article-item" href="${escapeAttr(article.url)}" target="_blank" rel="noopener noreferrer">
                                    <div class="article-title">${escapeHtml(article.title)}</div>
                                    <div class="article-meta">
                                          <span class="article-kw-badge">${escapeHtml(article.keyword)}</span>
                                          <span>${escapeHtml(article.source || "")}</span>
                                    </div>
                              </a>`;
  }
  html += "</div>";
  container.innerHTML = html;
}

export function renderMineExternalFeedStatus(options: {
  container: HTMLElement;
  message: string;
}): void {
  const { container, message } = options;
  container.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:4px 0">${message}</div>`;
}

export function activateDiscoverPane(options: {
  tab: "hot" | "ext";
  trigger?: HTMLElement | null;
  root?: ParentNode;
}): void {
  const { tab, trigger, root = document } = options;

  root
    .querySelectorAll(".discover-tab")
    .forEach((button) => button.classList.remove("active"));
  if (trigger) {
    trigger.classList.add("active");
  }

  const hotPane = root.querySelector("#discoverPaneHot");
  const extPane = root.querySelector("#discoverPaneExt");
  hotPane?.classList.toggle("active", tab === "hot");
  extPane?.classList.toggle("active", tab === "ext");
}

export function renderNewMineChatSession(options: {
  chatMessages: HTMLElement;
  titleElement: HTMLElement | null;
}): void {
  const { chatMessages, titleElement } = options;
  if (titleElement) {
    titleElement.textContent = "新对话";
  }
  chatMessages.innerHTML =
    '<div class="chat-msg ai">你好！我是全能 AI 助手，实时获取热搜 + 联网搜索，随时回答你的问题——新闻、科技、文化、百科……问我就对了！</div>';
}

export function renderMineChatTranscript(options: {
  chatMessages: HTMLElement;
  messages: ChatMessage[];
  escapeHtml: (value: string) => string;
  formatChatText: (value: string) => string;
}): void {
  const { chatMessages, messages, escapeHtml, formatChatText } = options;

  let html = "";
  for (const message of messages) {
    const cls = message.role === "user" ? "user" : "ai";
    html += `<div class="chat-msg ${cls}">${cls === "ai" ? formatChatText(message.content) : escapeHtml(message.content)}</div>`;
  }

  if (!html) {
    html = '<div class="chat-msg ai">（此会话暂无消息）</div>';
  }

  chatMessages.innerHTML = html;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
