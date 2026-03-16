import { createStore } from "@/shared/lib/store";

describe("createStore", () => {
  it("updates state and notifies subscribers", () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();

    store.subscribe(listener);
    store.setState((state) => ({ count: state.count + 1 }));

    expect(store.getState()).toEqual({ count: 1 });
    expect(listener).toHaveBeenCalledWith({ count: 1 });
  });
});
