import { getAuthToken } from "@/features/auth/auth.service";
import type {
  PreferenceKeyword,
  PreferencesResponse,
} from "@/features/preferences/preferences.types";
import { API_BASE } from "@/shared/config/env";
import { fetchJson } from "@/shared/lib/fetcher";

function authHeaders(contentType = false): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {};

  if (contentType) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  return headers;
}

export function fetchPreferences(): Promise<PreferencesResponse> {
  return fetchJson<PreferencesResponse>(`${API_BASE}/api/preferences`, {
    headers: authHeaders(),
  });
}

export function likeTopic(payload: {
  platform: string;
  title: string;
  url: string;
}): Promise<{ status: string; title: string }> {
  return fetchJson(`${API_BASE}/api/preferences/like`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });
}

export function unlikeTopic(title: string): Promise<{ status: string; title: string }> {
  return fetchJson(`${API_BASE}/api/preferences/unlike`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ title }),
  });
}

export function createKeyword(keyword: string): Promise<{
  status: string;
  keywords: PreferenceKeyword[];
}> {
  return fetchJson(`${API_BASE}/api/preferences/keyword`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ keyword }),
  });
}

export function deleteKeywordRequest(id: number): Promise<{ status: string }> {
  return fetchJson(`${API_BASE}/api/preferences/keyword/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}
