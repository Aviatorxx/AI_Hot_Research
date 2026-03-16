import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Shared localStorage stub
// ---------------------------------------------------------------------------
function makeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
    clear: () => data.clear(),
  };
}

// ---------------------------------------------------------------------------
// refreshData coordinator flow
// ---------------------------------------------------------------------------
describe("hot-feed coordinator: refreshData", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeStorage());
    document.body.innerHTML = `
      <button id="btnRefresh"></button>
      <div id="statTotal"></div>
      <div id="statPlatforms"></div>
      <div id="statTime"></div>
      <div id="statAnalyses"></div>
      <div id="platformTabs"></div>
      <div id="topicListContainer"></div>
      <div id="topicCount"></div>
    `;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("calls refreshTopics, emits ui:update, and shows success toast", async () => {
    const mockRefreshTopics = vi.fn().mockResolvedValue({ platforms: {} });
    const mockPushToast = vi.fn();
    const mockEmit = vi.fn();

    vi.doMock("@/features/topics/topics.service", () => ({
      refreshTopics: mockRefreshTopics,
    }));
    vi.doMock("@/shared/components/toast/toast", () => ({
      pushToast: mockPushToast,
    }));
    vi.doMock("@/app/app-event-bus", () => ({
      appBus: { emit: mockEmit, on: vi.fn() },
    }));

    const { refreshData } = await import("@/app/hot-feed.coordinator");
    await refreshData();

    expect(mockRefreshTopics).toHaveBeenCalledOnce();
    expect(mockEmit).toHaveBeenCalledWith("ui:update", undefined);
    expect(mockPushToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("shows error toast when refreshTopics throws", async () => {
    const mockRefreshTopics = vi.fn().mockRejectedValue(new Error("network fail"));
    const mockPushToast = vi.fn();

    vi.doMock("@/features/topics/topics.service", () => ({
      refreshTopics: mockRefreshTopics,
    }));
    vi.doMock("@/shared/components/toast/toast", () => ({
      pushToast: mockPushToast,
    }));
    vi.doMock("@/app/app-event-bus", () => ({
      appBus: { emit: vi.fn(), on: vi.fn() },
    }));

    const { refreshData } = await import("@/app/hot-feed.coordinator");
    await refreshData();

    expect(mockPushToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });
});

// ---------------------------------------------------------------------------
// toggleLike coordinator flow
// ---------------------------------------------------------------------------
describe("hot-feed coordinator: toggleLike", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeStorage());
    document.body.innerHTML = `<div id="platformTabs"></div>`;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("toggles liked class and calls toggleTopicLike", async () => {
    const mockToggleLike = vi.fn().mockResolvedValue(true);

    vi.doMock("@/features/preferences/preferences.service", () => ({
      toggleTopicLike: mockToggleLike,
    }));
    vi.doMock("@/shared/components/toast/toast", () => ({
      pushToast: vi.fn(),
    }));
    vi.doMock("@/app/app-event-bus", () => ({
      appBus: { emit: vi.fn(), on: vi.fn() },
    }));

    const element = document.createElement("button");
    element.className = "topic-action-btn like-btn";

    const { toggleLike } = await import("@/app/hot-feed.coordinator");
    await toggleLike(element, "Test Topic", "weibo", "https://example.com");

    expect(mockToggleLike).toHaveBeenCalledWith({
      title: "Test Topic",
      platform: "weibo",
      url: "https://example.com",
    });
    expect(element.classList.contains("liked")).toBe(true);
  });

  it("shows error toast when toggleTopicLike throws", async () => {
    const mockToggleLike = vi.fn().mockRejectedValue(new Error("api error"));
    const mockPushToast = vi.fn();

    vi.doMock("@/features/preferences/preferences.service", () => ({
      toggleTopicLike: mockToggleLike,
    }));
    vi.doMock("@/shared/components/toast/toast", () => ({
      pushToast: mockPushToast,
    }));
    vi.doMock("@/app/app-event-bus", () => ({
      appBus: { emit: vi.fn(), on: vi.fn() },
    }));

    const element = document.createElement("button");
    const { toggleLike } = await import("@/app/hot-feed.coordinator");
    await toggleLike(element, "Test Topic", "weibo", "");

    expect(mockPushToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });
});

// ---------------------------------------------------------------------------
// submitAuth coordinator flow
// ---------------------------------------------------------------------------
describe("auth coordinator: submitAuth", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeStorage());
    document.body.innerHTML = `
      <div id="loginModalOverlay"></div>
      <input id="authUsername" value="testuser" />
      <input id="authPassword" value="password123" />
      <div id="authError"></div>
      <button id="authTabLogin"></button>
      <button id="authTabRegister"></button>
      <button id="authSubmitBtn"></button>
      <div id="authArea"></div>
      <div id="chatSessionBar" style="display:flex"></div>
      <div id="sessionTitle"></div>
      <input id="chatInput" />
    `;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("validates credentials, calls submitAuthRequest and emits auth:login", async () => {
    const mockSubmitAuthRequest = vi.fn().mockResolvedValue({
      token: "tok123",
      username: "testuser",
      id: 1,
    });
    const mockLoadPreferences = vi.fn().mockResolvedValue({});
    const mockEmit = vi.fn();
    const mockPushToast = vi.fn();

    vi.doMock("@/features/auth/auth.service", () => ({
      submitAuthRequest: mockSubmitAuthRequest,
      clearAuthSession: vi.fn(),
      verifyAuthSession: vi.fn(),
    }));
    vi.doMock("@/features/preferences/preferences.service", () => ({
      loadPreferencesState: mockLoadPreferences,
      clearPreferencesState: vi.fn(),
    }));
    vi.doMock("@/features/chat/chat.service", () => ({
      resetChatSessionState: vi.fn(),
    }));
    vi.doMock("@/app/app-event-bus", () => ({
      appBus: { emit: mockEmit, on: vi.fn() },
    }));
    vi.doMock("@/shared/components/toast/toast", () => ({
      pushToast: mockPushToast,
    }));

    const { submitAuth } = await import("@/app/auth.coordinator");
    await submitAuth();

    expect(mockSubmitAuthRequest).toHaveBeenCalledWith("login", {
      username: "testuser",
      password: "password123",
    });
    expect(mockEmit).toHaveBeenCalledWith("auth:login", { username: "testuser" });
    expect(mockPushToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("shows error when username is empty", async () => {
    document.body.innerHTML = `
      <input id="authUsername" value="" />
      <input id="authPassword" value="pass" />
      <div id="authError"></div>
      <button id="authTabLogin"></button>
      <button id="authTabRegister"></button>
      <button id="authSubmitBtn"></button>
    `;

    vi.doMock("@/features/auth/auth.service", () => ({
      submitAuthRequest: vi.fn(),
      clearAuthSession: vi.fn(),
      verifyAuthSession: vi.fn(),
    }));
    vi.doMock("@/features/preferences/preferences.service", () => ({
      loadPreferencesState: vi.fn(),
      clearPreferencesState: vi.fn(),
    }));
    vi.doMock("@/features/chat/chat.service", () => ({
      resetChatSessionState: vi.fn(),
    }));
    vi.doMock("@/app/app-event-bus", () => ({
      appBus: { emit: vi.fn(), on: vi.fn() },
    }));
    vi.doMock("@/shared/components/toast/toast", () => ({
      pushToast: vi.fn(),
    }));

    const { submitAuth } = await import("@/app/auth.coordinator");
    await submitAuth();

    const errorEl = document.getElementById("authError");
    expect(errorEl?.textContent).toBe("请输入用户名和密码");
  });
});

// ---------------------------------------------------------------------------
// sendChat coordinator flow
// ---------------------------------------------------------------------------
describe("chat coordinator: sendChat", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeStorage());
    document.body.innerHTML = `
      <input id="chatInput" value="Hello AI" />
      <div id="chatMessages"></div>
      <div id="sessionTitle"></div>
    `;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("calls openLogin when not authenticated", async () => {
    vi.doMock("@/features/chat/chat.service", () => ({
      submitChatMessage: vi.fn(),
      loadChatSessionsState: vi.fn(),
      removeChatSession: vi.fn(),
      resetChatSessionState: vi.fn(),
      restoreChatSession: vi.fn(),
    }));
    vi.doMock("@/shared/components/toast/toast", () => ({
      pushToast: vi.fn(),
    }));

    const { authStore } = await import("@/features/auth/auth.store");
    authStore.setState({ token: null, currentUser: null });

    const { sendChat } = await import("@/app/chat.coordinator");
    const openLoginMock = vi.fn();

    await sendChat(openLoginMock);

    expect(openLoginMock).toHaveBeenCalledOnce();
  });

  it("appends user message and pending AI bubble when authenticated", async () => {
    const mockSubmitChatMessage = vi.fn().mockResolvedValue({
      answer: "I am an AI",
      session_id: 42,
    });

    vi.doMock("@/features/chat/chat.service", () => ({
      submitChatMessage: mockSubmitChatMessage,
      loadChatSessionsState: vi.fn(),
      removeChatSession: vi.fn(),
      resetChatSessionState: vi.fn(),
      restoreChatSession: vi.fn(),
    }));
    vi.doMock("@/shared/components/toast/toast", () => ({
      pushToast: vi.fn(),
    }));

    const { authStore } = await import("@/features/auth/auth.store");
    authStore.setState({ token: "tok123", currentUser: { username: "u" } });

    const { sendChat } = await import("@/app/chat.coordinator");
    await sendChat(() => {});

    expect(mockSubmitChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({ question: "Hello AI" }),
    );
    const messages = document.getElementById("chatMessages");
    expect(messages?.textContent).toContain("Hello AI");
  });
});
