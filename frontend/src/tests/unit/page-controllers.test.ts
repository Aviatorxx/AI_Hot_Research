import { renderHotFeedPage } from "@/pages/hot-feed/hot-feed.page";
import { renderMinePage } from "@/pages/mine/mine.page";

describe("page controllers", () => {
  it("normalizes hot feed page index and updates count text", () => {
    const container = document.createElement("div");
    const countElement = document.createElement("div");

    const currentPage = renderHotFeedPage({
      container,
      countElement,
      visibleTopics: [
        { title: "Alpha", platform: "weibo", hot_value: "100" },
        { title: "Beta", platform: "zhihu", hot_value: "90" },
      ],
      currentPlatform: "all",
      currentPage: 99,
      pageSize: 20,
      searchQuery: "alp",
      likedTitles: new Set<string>(),
      keywordTerms: [],
      platformNames: { weibo: "微博", zhihu: "知乎" },
      escapeHtml: (value) => value,
      escapeAttr: (value) => value,
      highlightText: (value) => value,
    });

    expect(currentPage).toBe(1);
    expect(countElement.textContent).toBe("1 / 2 topics");
    expect(container.innerHTML).toContain("Alpha");
    expect(container.innerHTML).not.toContain("Beta");
  });

  it("renders mine page count and container markup", () => {
    const container = document.createElement("div");
    const countElement = document.createElement("div");

    renderMinePage({
      container,
      countElement,
      likes: [["话题A", { platform: "weibo", url: "https://example.com" }]],
      related: [
        {
          title: "相关话题A",
          platform: "zhihu",
          matchedTerm: "话题",
          url: "https://example.com/related",
        },
      ],
      keywords: [{ id: 1, value: "AI" }],
      hasCurrentUser: true,
      platformNames: { weibo: "微博", zhihu: "知乎" },
      visiblePlatformIds: ["weibo", "zhihu"],
      activeDiscoverTab: "hot",
      escapeHtml: (value) => value,
      escapeAttr: (value) => value,
    });

    expect(countElement.textContent).toBe("1 saved · 1 related");
    expect(container.innerHTML).toContain("keywordTagsContainer");
    expect(container.innerHTML).toContain("chatHistoryList");
  });
});
