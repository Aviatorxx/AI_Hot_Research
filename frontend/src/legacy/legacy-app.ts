/**
 * Legacy bridge — no longer wires global window functions.
 * Event delegation via data-action attributes is now handled by controller.ts.
 * Kept as a reference stub.
 */
export function registerLegacyBridge(
  _target: Window & typeof globalThis = window,
): void {
  // No-op: global window functions replaced by data-action delegation.
}
