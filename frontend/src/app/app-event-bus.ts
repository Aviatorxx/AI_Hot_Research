import { createEventBus } from "@/shared/lib/event-bus";

/**
 * Singleton application event bus.
 * Domain coordinators emit and listen here instead of calling each other directly.
 *
 * Events:
 *   "auth:login"  — user signed in; payload: { username: string }
 *   "auth:logout" — user signed out; no payload
 *   "ui:update"   — request a full UI refresh; no payload
 */
export const appBus = createEventBus();
