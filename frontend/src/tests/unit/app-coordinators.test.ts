import {
  closeLoginModalUI,
  openLoginModalUI,
  renderAuthUI,
  switchAuthTabUI,
} from "@/app/session";
import {
  createAutoRefreshController,
  updateCountdownUI,
} from "@/app/refresh";
import {
  toggleNotifications,
  updateNotifyButton,
} from "@/app/notifications";

describe("app coordinators", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    });

    document.body.innerHTML = `
      <div id="loginModalOverlay"></div>
      <button id="authTabLogin"></button>
      <button id="authTabRegister"></button>
      <button id="authSubmitBtn"></button>
      <div id="authError"></div>
      <input id="authUsername" />
      <input id="authPassword" />
      <div id="authArea"></div>
      <div id="chatSessionBar"></div>
      <div id="sessionTitle"></div>
      <input id="chatInput" />
      <button id="notifyBtn"></button>
      <span id="autoRefreshLabel"></span>
      <svg><circle id="countdownArc"></circle></svg>
    `;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders auth UI and modal state", () => {
    switchAuthTabUI("register");
    openLoginModalUI();

    expect(document.getElementById("loginModalOverlay")?.classList.contains("active")).toBe(true);
    expect(document.getElementById("authTabRegister")?.classList.contains("active")).toBe(true);

    renderAuthUI({
      currentUser: { username: "tester" },
      escapeHtml: (value) => value,
    });

    expect(document.getElementById("authArea")?.textContent).toContain("tester");
    expect((document.getElementById("chatInput") as HTMLInputElement).disabled).toBe(false);

    closeLoginModalUI();
    expect(document.getElementById("loginModalOverlay")?.classList.contains("active")).toBe(false);
  });

  it("updates countdown and refresh controller state", () => {
    vi.useFakeTimers();
    const states: Array<{ enabled: boolean; countdown: number }> = [];
    const controller = createAutoRefreshController({
      intervalSeconds: 5,
      onRefresh: vi.fn(),
      onStateChange: (payload) => states.push(payload),
    });

    controller.start();
    vi.advanceTimersByTime(1000);
    updateCountdownUI({
      enabled: true,
      countdown: 4,
      interval: 5,
    });

    expect(states.length).toBeGreaterThan(1);
    expect(document.getElementById("autoRefreshLabel")?.textContent).toBe("0:04");

    controller.toggle();
    expect(controller.getEnabled()).toBe(false);
    vi.useRealTimers();
  });

  it("toggles notify state and button class", async () => {
    class NotificationMock {
      static permission = "granted";
      static requestPermission = vi.fn(async () => "granted");
    }

    vi.stubGlobal("Notification", NotificationMock as unknown as typeof Notification);

    updateNotifyButton(true);
    expect(document.getElementById("notifyBtn")?.classList.contains("enabled")).toBe(true);

    const enabled = await toggleNotifications({
      enabled: false,
      onError: vi.fn(),
      onSuccess: vi.fn(),
    });

    expect(enabled).toBe(true);
    expect(localStorage.getItem("notifyEnabled")).toBe("1");
  });
});
