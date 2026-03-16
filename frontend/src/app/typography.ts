import { STORAGE_KEYS } from "@/shared/config/constants";
import { getStoredString, setStoredString } from "@/shared/lib/storage";

export type FontScalePreference = "md" | "lg" | "xl";

function getRoot(): HTMLElement {
  return document.documentElement;
}

export function getFontScale(): FontScalePreference {
  const value = getRoot().getAttribute("data-font-scale");
  return value === "lg" || value === "xl" ? value : "md";
}

export function setFontScale(scale: FontScalePreference): void {
  getRoot().setAttribute("data-font-scale", scale);
  setStoredString(STORAGE_KEYS.fontScale, scale);
}

export function applyStoredFontScale(): void {
  const stored = getStoredString(STORAGE_KEYS.fontScale);
  setFontScale(stored === "lg" || stored === "xl" ? stored : "md");
}
