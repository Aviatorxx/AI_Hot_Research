import {
  deleteChatSessionRequest,
  fetchChatSessions,
  fetchSessionMessages,
  sendChatMessage,
} from "@/features/chat/chat.api";
import { chatStore } from "@/features/chat/chat.store";
import type {
  ChatMessage,
  ChatResponse,
  ChatSession,
} from "@/features/chat/chat.types";

export async function submitChatMessage(payload: {
  question: string;
  session_id: number | null;
}): Promise<ChatResponse> {
  chatStore.setState((state) => ({
    ...state,
    loading: true,
  }));

  try {
    const data = await sendChatMessage(payload);
    const nextMessages: ChatMessage[] = [
      ...chatStore.getState().messages,
      { role: "user", content: payload.question },
      {
        role: "assistant",
        content: data.answer || "抱歉，我暂时无法回答这个问题。",
      },
    ];
    chatStore.setState((state) => ({
      ...state,
      loading: false,
      currentSessionId: data.session_id ?? state.currentSessionId,
      messages: nextMessages,
    }));
    return data;
  } catch (error) {
    chatStore.setState((state) => ({
      ...state,
      loading: false,
    }));
    throw error;
  }
}

export async function loadChatSessionsState(): Promise<ChatSession[]> {
  const data = await fetchChatSessions();
  chatStore.setState((state) => ({
    ...state,
    sessions: data.sessions ?? [],
  }));
  return data.sessions ?? [];
}

export async function restoreChatSession(
  sessionId: number,
): Promise<ChatMessage[]> {
  const data = await fetchSessionMessages(sessionId);
  chatStore.setState((state) => ({
    ...state,
    currentSessionId: sessionId,
    messages: data.messages ?? [],
  }));
  return data.messages ?? [];
}

export async function removeChatSession(
  sessionId: number,
): Promise<void> {
  await deleteChatSessionRequest(sessionId);
  chatStore.setState((state) => ({
    ...state,
    sessions: state.sessions.filter((item) => item.id !== sessionId),
    currentSessionId:
      state.currentSessionId === sessionId ? null : state.currentSessionId,
    messages:
      state.currentSessionId === sessionId ? [] : state.messages,
  }));
}

export function resetChatSessionState(): void {
  chatStore.setState((state) => ({
    ...state,
    currentSessionId: null,
    messages: [],
  }));
}
