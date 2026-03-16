interface KeywordMatch {
  title: string;
  platform: string;
  kw: string;
  url: string;
}

interface BuildNotificationInput {
  allTopics: Record<string, Array<{ title: string; url?: string }>>;
  keywords: Array<{ value: string }>;
  oldTitles: Set<string>;
  notifiedThisSession: Set<string>;
}

export function buildKeywordMatches({
  allTopics,
  keywords,
  oldTitles,
  notifiedThisSession,
}: BuildNotificationInput): KeywordMatch[] {
  const kwTerms = keywords
    .map((item) => item.value.trim().toLowerCase())
    .filter(Boolean);

  const matches: KeywordMatch[] = [];

  for (const [platform, topics] of Object.entries(allTopics)) {
    for (const topic of topics || []) {
      if (oldTitles.has(topic.title)) continue;
      if (notifiedThisSession.has(topic.title)) continue;

      const lower = topic.title.toLowerCase();
      const matchedKw = kwTerms.find((kw) => lower.includes(kw));
      if (!matchedKw) continue;

      matches.push({
        title: topic.title,
        platform,
        kw: matchedKw,
        url: topic.url || "",
      });
      notifiedThisSession.add(topic.title);
    }
  }

  return matches;
}
