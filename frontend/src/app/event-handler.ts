export type ActionHandler = (
  element: HTMLElement,
  event: Event,
) => void | Promise<void>;

function shouldPreventClickDefault(target: HTMLElement): boolean {
  return target.matches(
    "button, a, summary, [role='button'], input[type='button'], input[type='submit']",
  );
}

/**
 * Register delegated event handlers via data-action (click),
 * data-input-action (input), and data-keydown-action (keydown) attributes.
 *
 * Returns an unsubscribe function.
 */
export function registerActionDelegation(options: {
  actions: Record<string, ActionHandler>;
  inputActions?: Record<string, ActionHandler>;
  keydownActions?: Record<string, ActionHandler>;
  changeActions?: Record<string, ActionHandler>;
}): () => void {
  const { actions, inputActions = {}, keydownActions = {}, changeActions = {} } = options;

  const clickHandler = (event: Event) => {
    const target = (event.target as HTMLElement).closest(
      "[data-action]",
    ) as HTMLElement | null;
    if (!target) return;
    const action = target.dataset.action;
    if (!action || !(action in actions)) return;
    if (shouldPreventClickDefault(target)) {
      event.preventDefault();
    }
    void actions[action](target, event);
  };

  const inputHandler = (event: Event) => {
    const target = (event.target as HTMLElement).closest(
      "[data-input-action]",
    ) as HTMLElement | null;
    if (!target) return;
    const action = target.dataset.inputAction;
    if (!action || !(action in inputActions)) return;
    void inputActions[action](target, event);
  };

  const keydownHandler = (event: Event) => {
    const ke = event as KeyboardEvent;
    const target = (ke.target as HTMLElement).closest(
      "[data-keydown-action]",
    ) as HTMLElement | null;
    if (!target) return;
    const action = target.dataset.keydownAction;
    if (!action || !(action in keydownActions)) return;
    void keydownActions[action](target, event);
  };

  const changeHandler = (event: Event) => {
    const target = (event.target as HTMLElement).closest(
      "[data-change-action]",
    ) as HTMLElement | null;
    if (!target) return;
    const action = target.dataset.changeAction;
    if (!action || !(action in changeActions)) return;
    void changeActions[action](target, event);
  };

  document.addEventListener("click", clickHandler);
  document.addEventListener("input", inputHandler);
  document.addEventListener("keydown", keydownHandler);
  document.addEventListener("change", changeHandler);

  return () => {
    document.removeEventListener("click", clickHandler);
    document.removeEventListener("input", inputHandler);
    document.removeEventListener("keydown", keydownHandler);
    document.removeEventListener("change", changeHandler);
  };
}
