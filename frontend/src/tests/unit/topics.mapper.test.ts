import { mapTopicsPayload } from "@/features/topics/topics.mapper";

describe("mapTopicsPayload", () => {
  it("normalizes missing topic fields", () => {
    const mapped = mapTopicsPayload({
      platforms: {
        weibo: [{ title: "A" }, { title: "B", url: "/b" }],
      },
      aggregated_topics: [
        { title: "聚合A", platforms: ["weibo"], platform_count: 1 },
      ],
      updated_at: null,
    });

    expect(mapped.platforms.weibo).toEqual([
      { title: "A", url: "", hot_value: "", category: "", normalized_category: "other", platform: undefined, rank: undefined, topic_key: "", velocity: undefined },
      { title: "B", url: "/b", hot_value: "", category: "", normalized_category: "other", platform: undefined, rank: undefined, topic_key: "", velocity: undefined },
    ]);
    expect(mapped.aggregated_topics[0]).toMatchObject({
      title: "聚合A",
      platforms: ["weibo"],
      platform_count: 1,
      normalized_category: "other",
      aggregate_score: 0,
    });
  });
});
