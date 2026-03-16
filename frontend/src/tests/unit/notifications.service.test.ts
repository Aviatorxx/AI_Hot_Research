import { buildKeywordMatches } from "@/features/notifications/notifications.service";

describe("buildKeywordMatches", () => {
  it("filters new keyword hits and avoids duplicates in session", () => {
    const notified = new Set<string>(["old-hit"]);
    const matches = buildKeywordMatches({
      allTopics: {
        weibo: [
          { title: "AI 芯片大涨", url: "/a" },
          { title: "old-hit", url: "/old" },
        ],
      },
      keywords: [{ value: "AI" }],
      oldTitles: new Set<string>(),
      notifiedThisSession: notified,
    });

    expect(matches).toEqual([
      { title: "AI 芯片大涨", platform: "weibo", kw: "ai", url: "/a" },
    ]);
    expect(notified.has("AI 芯片大涨")).toBe(true);
  });
});
