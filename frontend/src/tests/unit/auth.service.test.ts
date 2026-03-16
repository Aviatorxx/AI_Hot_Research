import { STORAGE_KEYS } from "@/shared/config/constants";

describe("clearAuthSession", () => {
  it("clears auth store and localStorage", async () => {
    const storage = {
      data: new Map<string, string>(),
      getItem(key: string) {
        return this.data.has(key) ? this.data.get(key)! : null;
      },
      setItem(key: string, value: string) {
        this.data.set(key, value);
      },
      removeItem(key: string) {
        this.data.delete(key);
      },
      clear() {
        this.data.clear();
      },
    };

    vi.stubGlobal("localStorage", storage);

    const { authStore } = await import("@/features/auth/auth.store");
    const { clearAuthSession } = await import("@/features/auth/auth.service");

    localStorage.setItem(STORAGE_KEYS.authToken, "token");
    authStore.setState({
      token: "token",
      currentUser: { username: "demo" },
    });

    clearAuthSession();

    expect(localStorage.getItem(STORAGE_KEYS.authToken)).toBeNull();
    expect(authStore.getState()).toEqual({
      token: null,
      currentUser: null,
    });
  });
});
