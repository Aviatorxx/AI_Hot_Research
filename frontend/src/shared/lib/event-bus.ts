type EventHandler<T = unknown> = (payload: T) => void;

export function createEventBus() {
  const listeners = new Map<string, Set<EventHandler>>();

  return {
    emit<T>(event: string, payload: T): void {
      listeners.get(event)?.forEach((handler) => handler(payload));
    },
    on<T>(event: string, handler: EventHandler<T>): () => void {
      const handlers = listeners.get(event) ?? new Set<EventHandler>();
      handlers.add(handler as EventHandler);
      listeners.set(event, handlers);
      return () => handlers.delete(handler as EventHandler);
    },
  };
}
