import { initializeApp } from "@/app/controller";
import { mountHotFeedPage } from "@/pages/hot-feed/hot-feed.page";

export function bootstrapApp(): void {
  const start = () => {
    mountHotFeedPage(document.body);
    void initializeApp();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
    return;
  }

  start();
}
