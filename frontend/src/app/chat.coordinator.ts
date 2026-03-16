import { authStore } from "@/features/auth/auth.store";
import { chatStore } from "@/features/chat/chat.store";
import {
  loadChatSessionsState,
  removeChatSession,
  resetChatSessionState,
  restoreChatSession,
  submitChatMessage,
} from "@/features/chat/chat.service";
import { escapeHtml, escapeAttr, formatChatText } from "@/shared/lib/format";
import { pushToast } from "@/shared/components/toast/toast";
import {
  renderMineChatHistory,
  renderMineChatTranscript,
  renderNewMineChatSession,
} from "@/pages/mine/mine.page";

let isChatFocused = false;

function applyChatFocusState(): void {
  const chatSection = document.getElementById("myChatSection");
  const overlay = document.getElementById("chatFocusOverlay");
  const button = document.getElementById("chatFocusBtn");
  if (!chatSection || !overlay || !button) return;

  chatSection.classList.toggle("chat-focused", isChatFocused);
  overlay.classList.toggle("active", isChatFocused);
  document.body.classList.toggle("chat-focus-mode", isChatFocused);
  button.setAttribute("aria-pressed", isChatFocused ? "true" : "false");
  button.textContent = isChatFocused ? "收起聊天" : "放大聊天";
}

export function toggleChatFocus(): void {
  isChatFocused = !isChatFocused;
  applyChatFocusState();
}

export function closeChatFocus(): void {
  if (!isChatFocused) return;
  isChatFocused = false;
  applyChatFocusState();
}

export function newChatSession(): void {
  resetChatSessionState();
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;
  renderNewMineChatSession({
    chatMessages,
    titleElement: document.getElementById("sessionTitle"),
  });
}

export async function sendChat(openLogin: () => void): Promise<void> {
  const { token } = authStore.getState();
  if (!token) {
    openLogin();
    return;
  }

  const input = document.getElementById("chatInput") as HTMLInputElement | null;
  const messages = document.getElementById("chatMessages");
  if (!input || !messages) return;

  const question = input.value.trim();
  if (!question) return;
  input.value = "";
  input.disabled = true;

  const userDiv = document.createElement("div");
  userDiv.className = "chat-msg user";
  userDiv.textContent = question;
  messages.appendChild(userDiv);

  const pendingDiv = document.createElement("div");
  pendingDiv.className = "chat-msg ai";
  pendingDiv.id = "chatPending";
  pendingDiv.innerHTML =
    '<div class="chat-typing"><span></span><span></span><span></span></div>';
  messages.appendChild(pendingDiv);
  messages.scrollTop = messages.scrollHeight;

  const { currentSessionId } = chatStore.getState();

  try {
    const data = await submitChatMessage({ question, session_id: currentSessionId });
    const pending = document.getElementById("chatPending");
    if (pending) {
      pending.id = "";
      pending.innerHTML = formatChatText(
        data.answer || "抱歉，我暂时无法回答这个问题。",
      );
    }

    const newSessionId = chatStore.getState().currentSessionId;
    if (newSessionId && newSessionId !== currentSessionId) {
      const titleEl = document.getElementById("sessionTitle");
      if (titleEl) {
        titleEl.textContent =
          question.slice(0, 20) + (question.length > 20 ? "…" : "");
      }
    }
  } catch (error: any) {
    const pending = document.getElementById("chatPending");
    if (pending) {
      pending.id = "";
      pending.innerHTML = `<span style="color:var(--neon-red)">请求失败: ${escapeHtml(error.message)}</span>`;
    }
  }

  input.disabled = false;
  input.focus();
  messages.scrollTop = messages.scrollHeight;
}

export async function loadChatSessions(): Promise<void> {
  const container = document.getElementById("chatHistoryList");
  const { token } = authStore.getState();
  if (!container || !token) return;
  try {
    const sessions = await loadChatSessionsState();
    renderMineChatHistory({
      container,
      sessions: sessions || [],
      escapeHtml,
      escapeAttr,
    });
  } catch {
    container.innerHTML =
      '<div style="font-size:12px;color:var(--text-muted)">加载失败</div>';
  }
}

export async function restoreSession(
  sessionId: number,
  title: string,
): Promise<void> {
  const { token } = authStore.getState();
  if (!token) return;
  try {
    const messagesData = await restoreChatSession(sessionId);
    const titleEl = document.getElementById("sessionTitle");
    if (titleEl) titleEl.textContent = title;
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;
    renderMineChatTranscript({
      chatMessages,
      messages: messagesData || [],
      escapeHtml,
      formatChatText,
    });
  } catch {
    pushToast({ message: "加载会话失败", type: "error" });
  }
}

export async function deleteSession(sessionId: number): Promise<void> {
  const { token } = authStore.getState();
  if (!token) return;
  const { currentSessionId } = chatStore.getState();
  const deletingCurrent = currentSessionId === sessionId;
  try {
    await removeChatSession(sessionId);
    if (deletingCurrent) {
      newChatSession();
    }
    await loadChatSessions();
  } catch {
    pushToast({ message: "删除失败", type: "error" });
  }
}
