import { PLATFORM_NAMES, STORAGE_KEYS } from "@/shared/config/constants";
import { setStoredBoolean } from "@/shared/lib/storage";

interface NotifyMatch {
  kw: string;
  title: string;
  platform: string;
}

export function updateNotifyButton(enabled: boolean): void {
  const btn = document.getElementById("notifyBtn");
  if (!btn) return;
  btn.classList.toggle("enabled", enabled);
  btn.title = enabled
    ? "关键词提醒已开启（点击关闭）"
    : "关键词热搜提醒（点击开启）";
}

export async function toggleNotifications(options: {
  enabled: boolean;
  onError: (message: string) => void;
  onSuccess: (message: string, type: "success" | "info") => void;
}): Promise<boolean> {
  const { enabled, onError, onSuccess } = options;

  if (!enabled) {
    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        onError("浏览器通知权限被拒绝，请在浏览器设置中允许");
        return enabled;
      }
    }

    if ("Notification" in window && Notification.permission !== "granted") {
      onError("请在浏览器设置中允许通知权限");
      return enabled;
    }

    setStoredBoolean(STORAGE_KEYS.notifyEnabled, true);
    onSuccess("🔔 关键词提醒已开启，热搜命中时将推送通知", "success");
    return true;
  }

  setStoredBoolean(STORAGE_KEYS.notifyEnabled, false);
  onSuccess("🔕 关键词提醒已关闭", "info");
  return false;
}

export function emitKeywordNotifications(options: {
  matches: NotifyMatch[];
  onToast: (message: string) => void;
  onNavigate: (payload: { platform: string; keyword: string }) => void;
}): void {
  const { matches, onToast, onNavigate } = options;

  if (matches.length === 0) return;

  const grouped: Record<string, NotifyMatch[]> = {};
  for (const match of matches) {
    if (!grouped[match.kw]) grouped[match.kw] = [];
    grouped[match.kw].push(match);
  }

  for (const [keyword, items] of Object.entries(grouped)) {
    const body =
      items.length === 1
        ? `「${items[0].title}」正在 ${PLATFORM_NAMES[items[0].platform] || items[0].platform} 热搜`
        : `${items.length} 条相关话题同时上榜：${items
            .map((item) => item.title)
            .join("、")
            .slice(0, 60)}`;

    try {
      const notification = new Notification(`🔔 关键词「${keyword}」上热搜！`, {
        body,
        icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%230A0A0F'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='central' text-anchor='middle' font-size='20'%3E%F0%9F%94%A5%3C/text%3E%3C/svg%3E",
        tag: `hotresearch-kw-${keyword}`,
      });

      notification.onclick = () => {
        window.focus();
        onNavigate({
          platform: items[0].platform,
          keyword,
        });
        notification.close();
      };
    } catch {
      // Ignore unsupported notification environments.
    }
  }

  const first = matches[0];
  onToast(`🔔 关键词「${first.kw}」命中热搜：${first.title}`);
}
