import { STORAGE_KEYS } from "@/shared/config/constants";
import { getStoredString, setStoredString } from "@/shared/lib/storage";

export type ThemePreference = "dark" | "light";

function getThemeRoot(): HTMLElement {
  return document.documentElement;
}

export function applyTheme(theme: ThemePreference): void {
  getThemeRoot().setAttribute("data-theme", theme);
}

export function getTheme(): ThemePreference {
  return getThemeRoot().getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function applyStoredTheme(): void {
  const stored = getStoredString(STORAGE_KEYS.themePreference);
  if (stored === "light" || stored === "dark") {
    applyTheme(stored);
    return;
  }
  applyTheme(
    window.matchMedia?.("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark",
  );
}

export function toggleTheme(): ThemePreference {
  const nextTheme: ThemePreference = getTheme() === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  setStoredString(STORAGE_KEYS.themePreference, nextTheme);
  return nextTheme;
}
