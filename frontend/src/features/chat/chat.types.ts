export interface ChatResponse {
  answer: string;
  session_id: number | null;
}

export interface ChatSession {
  id: number;
  title?: string;
  created_at?: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | string;
  content: string;
  created_at?: string;
}

export interface ChatState {
  currentSessionId: number | null;
  sessions: ChatSession[];
  messages: ChatMessage[];
  loading: boolean;
}
