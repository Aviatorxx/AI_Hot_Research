import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { registerActionDelegation } from "@/app/event-handler";

describe("registerActionDelegation", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("dispatches click, input, and keydown actions by data attributes", () => {
    document.body.innerHTML = `
      <button id="refresh" data-action="refreshData">Refresh</button>
      <input id="search" data-input-action="onSearchInput" data-keydown-action="searchInputKeydown" />
    `;

    const onClick = vi.fn();
    const onInput = vi.fn();
    const onKeydown = vi.fn();

    const dispose = registerActionDelegation({
      actions: { refreshData: onClick },
      inputActions: { onSearchInput: onInput },
      keydownActions: { searchInputKeydown: onKeydown },
    });

    document.getElementById("refresh")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );

    const search = document.getElementById("search") as HTMLInputElement;
    search.value = "ai";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    search.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(onInput).toHaveBeenCalledWith(search, expect.any(Event));
    expect(onKeydown).toHaveBeenCalledWith(
      search,
      expect.objectContaining({ key: "Escape" }),
    );

    dispose();
  });

  it("supports backdrop guards in handlers without closing on inner clicks", () => {
    document.body.innerHTML = `
      <div id="overlay" data-action="closeModalOnBackdrop">
        <div id="dialog">
          <button id="inner">Inner</button>
        </div>
      </div>
    `;

    let guardedCloseCount = 0;
    const closeModal = vi.fn((element: HTMLElement, event: Event) => {
      if (event.target === element) {
        guardedCloseCount += 1;
      }
    });

    const dispose = registerActionDelegation({
      actions: { closeModalOnBackdrop: closeModal },
    });

    document.getElementById("inner")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    document.getElementById("overlay")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );

    expect(closeModal).toHaveBeenCalledTimes(2);
    expect(closeModal.mock.calls[0]?.[0]).toBe(document.getElementById("overlay"));
    expect(closeModal.mock.calls[0]?.[1].target).toBe(document.getElementById("inner"));
    expect(closeModal.mock.calls[1]?.[1].target).toBe(document.getElementById("overlay"));
    expect(guardedCloseCount).toBe(1);

    dispose();
  });
});

describe("source index template", () => {
  it("does not contain inline event handlers", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(html).not.toMatch(/\son(click|input|keydown|submit|load)=/);
    expect(html).toContain('data-action="refreshData"');
    expect(html).toContain('data-input-action="onSearchInput"');
    expect(html).toContain('data-keydown-action="submitAuthOnEnter"');
  });
});
