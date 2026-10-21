import { formatEditorShortcut, isApplePlatform } from "./shortcuts";

/** The toolbar's one tooltip: the button it describes, its label and shortcut, and whether it shows. */
export interface LoomaToolbarTooltipState {
  readonly for: string;
  readonly label: string;
  readonly shortcut: string;
  readonly open: boolean;
}

/** How long, in milliseconds, the first button waits before its tooltip shows. */
export const LOOMA_TOOLBAR_TOOLTIP_DELAY = 400;

/**
 * One tooltip that follows a toolbar row: the first button waits, and moving along the row while it
 * shows is immediate, which the native `title` attribute cannot do.
 *
 * @ownership The host renders the tooltip from the state and calls `show` and `hide` from its buttons.
 * @lifecycle A pending delay runs until `hide()` or `destroy()`.
 */
export interface LoomaToolbarTooltip {
  readonly state: LoomaToolbarTooltipState;
  /** Describes the button with `id`; `immediate` skips the delay, as keyboard focus does. */
  show(id: string, label: string, immediate: boolean, shortcut?: string): void;
  hide(): void;
  destroy(): void;
}

/** Calls `onChange` after every state change. */
export function createToolbarTooltip(onChange: (state: LoomaToolbarTooltipState) => void, delay: () => number = () => LOOMA_TOOLBAR_TOOLTIP_DELAY): LoomaToolbarTooltip {
  let state: LoomaToolbarTooltipState = { for: "", label: "", shortcut: "", open: false };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const set = (patch: Partial<LoomaToolbarTooltipState>) => {
    state = { ...state, ...patch };
    onChange(state);
  };
  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  return {
    get state() { return state; },
    show(id, label, immediate, shortcut = "") {
      clear();
      const open = immediate || state.open;
      set({ for: id, label, shortcut: shortcut ? formatEditorShortcut(shortcut, isApplePlatform()) : "", open });
      if (!open) timer = setTimeout(() => { timer = undefined; set({ open: true }); }, delay());
    },
    hide() {
      clear();
      if (state.open) set({ open: false });
    },
    destroy: clear,
  };
}
