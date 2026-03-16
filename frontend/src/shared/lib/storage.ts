export function getStoredString(key: string): string | null {
  return localStorage.getItem(key);
}

export function setStoredString(key: string, value: string): void {
  localStorage.setItem(key, value);
}

export function removeStoredValue(key: string): void {
  localStorage.removeItem(key);
}

export function getStoredBoolean(key: string): boolean {
  return localStorage.getItem(key) === "1";
}

export function setStoredBoolean(key: string, value: boolean): void {
  localStorage.setItem(key, value ? "1" : "0");
}
