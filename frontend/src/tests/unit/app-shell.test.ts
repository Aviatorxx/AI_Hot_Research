import {
  renderPlatformTabsMarkup,
  summarizeDashboard,
} from "@/app/layout";
import {
  applyPlatformShell,
  getVisibleTopicsForPlatform,
} from "@/app/router";

describe("app shell helpers", () => {
  it("summarizes dashboard totals", () => {
    const summary = summarizeDashboard({
      allTopics: {
        weibo: [{ title: "A" }, { title: "B" }],
        zhihu: [{ title: "C" }],
        baidu: [],
      },
      aggregatedTopics: [
        { title: "A", platforms: ["weibo"], platform_count: 1, velocity: { direction: "new", delta: 0, label: "NEW" } },
        { title: "B", platforms: ["zhihu", "baidu"], platform_count: 2, velocity: { direction: "up", delta: 3, label: "↑3" } },
      ],
      updatedAt: "2026-03-15T05:00:00+08:00",
      analysisCount: 7,
      now: new Date("2026-03-15T05:06:00+08:00"),
    });

    expect(summary.total).toBe(3);
    expect(summary.activePlatforms).toBe(2);
    expect(summary.analysisCount).toBe(7);
    expect(summary.time).toBeTruthy();
    expect(summary.newTopics).toBe(1);
    expect(summary.resonance).toBe(1);
    expect(summary.rising).toBe(1);
  });

  it("renders platform tabs with current selection", () => {
    const html = renderPlatformTabsMarkup({
      allTopics: {
        github: [{ title: "Repo" }],
        weibo: [{ title: "热搜A" }],
      },
      aggregatedTopics: [{ title: "聚合A", platforms: ["weibo"], platform_count: 1 }],
      currentPlatform: "mine",
      platformNames: {
        weibo: "微博热搜",
        github: "GitHub Trending",
      },
      visiblePlatformIds: ["github"],
    });

    expect(html).toContain("mine-tab active");
    expect(html).toContain("GitHub Trending");
    expect(html).not.toContain("微博热搜");
  });

  it("resolves visible topics for all and applies shell mode", () => {
    const topics = getVisibleTopicsForPlatform(
      {
        weibo: [{ title: "热搜A" }],
        zhihu: [{ title: "问题B" }],
      },
      "all",
    );

    expect(topics).toHaveLength(2);
    expect(topics[0].platform).toBe("weibo");

    const searchWrap = document.createElement("div");
    const chatSection = document.createElement("div");
    applyPlatformShell({
      platform: "mine",
      searchWrap,
      chatSection,
    });

    expect(searchWrap.style.display).toBe("none");
    expect(chatSection.style.display).toBe("flex");
  });
});
