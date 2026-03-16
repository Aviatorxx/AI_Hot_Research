import { getAuthToken } from "@/features/auth/auth.service";
import type {
  ChatMessage,
  ChatResponse,
  ChatSession,
} from "@/features/chat/chat.types";
import { API_BASE } from "@/shared/config/env";
import { fetchJson } from "@/shared/lib/fetcher";

function authHeaders(contentType = false): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {};

  if (contentType) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  return headers;
}

export function sendChatMessage(payload: {
  question: string;
  session_id: number | null;
}): Promise<ChatResponse> {
  return fetchJson<ChatResponse>(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(payload),
    timeoutMs: 20_000,
  });
}

export function fetchChatSessions(): Promise<{ sessions: ChatSession[] }> {
  return fetchJson<{ sessions: ChatSession[] }>(`${API_BASE}/api/chat/sessions`, {
    headers: authHeaders(),
    timeoutMs: 10_000,
  });
}

export function fetchSessionMessages(
  sessionId: number,
): Promise<{ messages: ChatMessage[] }> {
  return fetchJson<{ messages: ChatMessage[] }>(
    `${API_BASE}/api/chat/sessions/${sessionId}/messages`,
    {
      headers: authHeaders(),
      timeoutMs: 10_000,
    },
  );
}

export function deleteChatSessionRequest(
  sessionId: number,
): Promise<{ status: string }> {
  return fetchJson<{ status: string }>(
    `${API_BASE}/api/chat/sessions/${sessionId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
      timeoutMs: 10_000,
    },
  );
}
