export function formatClock(date = new Date()): string {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function escapeHtml(value: string): string {
  if (!value) return "";
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

export function escapeAttr(value: string): string {
  return (value || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

export function highlightText(
  escapedHtml: string,
  term: string,
  cls: string,
): string {
  if (!term) return escapedHtml;
  const escaped = escapeHtml(term);
  const re = new RegExp(escaped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return escapedHtml.replace(
    re,
    (match) => `<mark class="${cls}">${match}</mark>`,
  );
}

export function formatChatText(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}
