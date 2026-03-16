export type StoreListener<T> = (state: T) => void;
export type StateUpdater<T> = T | ((state: T) => T);

export interface Store<T> {
  getState: () => T;
  setState: (updater: StateUpdater<T>) => T;
  subscribe: (listener: StoreListener<T>) => () => void;
}

export function createStore<T>(initialState: T): Store<T> {
  let state = initialState;
  const listeners = new Set<StoreListener<T>>();

  function getState(): T {
    return state;
  }

  function setState(updater: StateUpdater<T>): T {
    state =
      typeof updater === "function"
        ? (updater as (state: T) => T)(state)
        : updater;

    for (const listener of listeners) {
      listener(state);
    }

    return state;
  }

  function subscribe(listener: StoreListener<T>): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    getState,
    setState,
    subscribe,
  };
}
