import {
  getHotFeedRoot,
  renderAnalysisPanelMarkup,
  renderHotFeedMarkup,
  renderTopicAnalysisMarkup,
} from "@/pages/hot-feed/hot-feed.view";

type HotFeedRenderOptions = Parameters<typeof renderHotFeedMarkup>[0];
type AnalysisPanelRenderOptions = Parameters<typeof renderAnalysisPanelMarkup>[0];
type TopicAnalysisRenderOptions = Parameters<typeof renderTopicAnalysisMarkup>[0];

export function mountHotFeedPage(root: HTMLElement): void {
  root.dataset.appMounted = "true";
  const feedRoot = getHotFeedRoot();
  if (feedRoot) {
    feedRoot.dataset.page = "hot-feed";
  }
}

export function renderHotFeedPage(options: {
  container: HTMLElement;
  countElement: HTMLElement | null;
  visibleTopics: HotFeedRenderOptions["topics"];
  currentPlatform: HotFeedRenderOptions["currentPlatform"];
  currentPage: number;
  pageSize: number;
  searchQuery: string;
  likedTitles: HotFeedRenderOptions["likedTitles"];
  keywordTerms: HotFeedRenderOptions["keywordTerms"];
  platformNames: HotFeedRenderOptions["platformNames"];
  escapeHtml: HotFeedRenderOptions["escapeHtml"];
  escapeAttr: HotFeedRenderOptions["escapeAttr"];
  highlightText: HotFeedRenderOptions["highlightText"];
  feedContext?: HotFeedRenderOptions["feedContext"];
}): number {
  const {
    container,
    countElement,
    visibleTopics,
    currentPlatform,
    currentPage,
    pageSize,
    searchQuery,
    likedTitles,
    keywordTerms,
    platformNames,
    escapeHtml,
    escapeAttr,
    highlightText,
    feedContext,
  } = options;

  const topics = searchQuery
    ? visibleTopics.filter((topic) =>
        topic.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : visibleTopics;

  const totalTopics = topics.length;
  const totalPages = Math.max(1, Math.ceil(totalTopics / pageSize));
  const normalizedPage = currentPage > totalPages ? 1 : currentPage;

  if (countElement) {
    countElement.textContent = searchQuery
      ? `${totalTopics} / ${visibleTopics.length} topics`
      : `${visibleTopics.length} topics`;
  }

  container.innerHTML = renderHotFeedMarkup({
    topics,
    currentPlatform,
    currentPage: normalizedPage,
    pageSize,
    searchQuery,
    likedTitles,
    keywordTerms,
    platformNames,
    escapeHtml,
    escapeAttr,
    highlightText,
    feedContext,
  });

  return normalizedPage;
}

export function renderHotFeedAnalysisPanel(options: {
  container: HTMLElement;
  data: AnalysisPanelRenderOptions["data"];
  jobs?: AnalysisPanelRenderOptions["jobs"];
  selectedJobId?: AnalysisPanelRenderOptions["selectedJobId"];
  escapeHtml: AnalysisPanelRenderOptions["escapeHtml"];
  escapeAttr: AnalysisPanelRenderOptions["escapeAttr"];
}): void {
  const { container, data, jobs, selectedJobId, escapeHtml, escapeAttr } = options;
  container.innerHTML = renderAnalysisPanelMarkup({
    data,
    jobs,
    selectedJobId,
    escapeHtml,
    escapeAttr,
  });
}

export function renderHotFeedAnalysisLoading(container: HTMLElement): void {
  container.innerHTML =
    '<div class="loading-skeleton"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></div>';
}

export function renderTopicAnalysisModal(options: {
  titleElement: HTMLElement;
  bodyElement: HTMLElement;
  data: TopicAnalysisRenderOptions["data"];
  escapeHtml: TopicAnalysisRenderOptions["escapeHtml"];
  escapeAttr: TopicAnalysisRenderOptions["escapeAttr"];
}): void {
  const { titleElement, bodyElement, data, escapeHtml, escapeAttr } = options;
  const modal = renderTopicAnalysisMarkup({
    data,
    escapeHtml,
    escapeAttr,
  });

  titleElement.textContent = modal.title;
  bodyElement.innerHTML = modal.bodyHtml;
}
