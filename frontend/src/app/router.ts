export function getVisibleTopicsForPlatform<T extends { title: string }>(
  allTopics: Record<string, T[] | undefined>,
  currentPlatform: string,
): Array<T & { platform: string }> {
  if (currentPlatform === "all") {
    const merged: Array<T & { platform: string }> = [];
    for (const [platform, topics] of Object.entries(allTopics)) {
      for (const topic of topics || []) {
        merged.push({ ...topic, platform });
      }
    }
    return merged;
  }

  return ((allTopics[currentPlatform] || []) as T[]).map((topic) => ({
    ...topic,
    platform: currentPlatform,
  }));
}

export function applyPlatformShell(options: {
  platform: string;
  searchWrap: HTMLElement | null;
  chatSection: HTMLElement | null;
}): void {
  const { platform, searchWrap, chatSection } = options;
  const isMine = platform === "mine";
  const columns = document.querySelector(".content-columns");
  const rightPanels = document.querySelector(".right-panels");
  const aiCard = document.querySelector(".card-ai-panel");
  const chatOverlay = document.getElementById("chatFocusOverlay");

  if (chatSection) {
    chatSection.style.display = isMine ? "flex" : "none";
    if (!isMine) {
      chatSection.classList.remove("chat-focused");
      document.body.classList.remove("chat-focus-mode");
      chatOverlay?.classList.remove("active");
    }
  }
  if (searchWrap) {
    searchWrap.style.display = isMine ? "none" : "";
  }
  columns?.classList.toggle("is-mine", isMine);
  rightPanels?.classList.toggle("is-mine", isMine);
  aiCard?.classList.toggle("is-mine", isMine);
}
