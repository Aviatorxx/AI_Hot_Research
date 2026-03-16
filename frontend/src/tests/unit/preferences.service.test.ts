describe("clearPreferencesState", () => {
  it("resets likes and keywords", async () => {
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

    const { preferencesStore } = await import(
      "@/features/preferences/preferences.store"
    );
    const { clearPreferencesState } = await import(
      "@/features/preferences/preferences.service"
    );

    preferencesStore.setState({
      likes: { demo: { platform: "weibo", url: "" } },
      keywords: [{ id: 1, value: "demo" }],
    });

    clearPreferencesState();

    expect(preferencesStore.getState()).toEqual({
      likes: {},
      keywords: [],
    });
  });
});
