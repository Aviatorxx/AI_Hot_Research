import type { ChatState } from "@/features/chat/chat.types";
import { createStore } from "@/shared/lib/store";

const initialState: ChatState = {
  currentSessionId: null,
  sessions: [],
  messages: [],
  loading: false,
};

export const chatStore = createStore(initialState);
