"use client";

/**
 * A very small window manager.
 *
 * Windows are pure UI state and deliberately kept out of the runner reducer —
 * moving a window is not a fact about the résumé. Anything that *is* a fact
 * (opening a spec) still dispatches into the runner, so the two surfaces stay
 * in sync exactly as before.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type WindowId = "terminal" | "files" | "resume";

export interface WindowState {
  id: WindowId;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  open: boolean;
  minimized: boolean;
  maximized: boolean;
}

interface State {
  windows: Record<WindowId, WindowState>;
  order: WindowId[];
  topZ: number;
}

type Action =
  | { type: "FOCUS"; id: WindowId }
  | { type: "OPEN"; id: WindowId }
  | { type: "CLOSE"; id: WindowId }
  | { type: "MINIMIZE"; id: WindowId }
  | { type: "RESTORE"; id: WindowId }
  | { type: "TOGGLE_MAX"; id: WindowId }
  | { type: "MOVE"; id: WindowId; x: number; y: number };

const initial: State = {
  topZ: 3,
  order: ["files", "terminal"],
  windows: {
    files: {
      id: "files",
      title: "Files — ~/manny-castillo",
      x: 24,
      y: 24,
      w: 336,
      h: 440,
      z: 1,
      open: true,
      minimized: false,
      maximized: false,
    },
    terminal: {
      id: "terminal",
      title: "manny@portfolio — zsh",
      x: 396,
      y: 52,
      w: 740,
      h: 500,
      z: 2,
      open: true,
      minimized: false,
      maximized: false,
    },
    resume: {
      id: "resume",
      title: "manny-castillo-resume.pdf",
      x: 232,
      y: 56,
      w: 700,
      h: 560,
      z: 3,
      open: false,
      minimized: false,
      maximized: false,
    },
  },
};

function reducer(state: State, action: Action): State {
  const win = state.windows[action.id];
  if (!win) return state;

  const focus = (patch: Partial<WindowState> = {}): State => ({
    ...state,
    topZ: state.topZ + 1,
    windows: {
      ...state.windows,
      [action.id]: { ...win, z: state.topZ + 1, ...patch },
    },
  });

  switch (action.type) {
    case "FOCUS":
      return win.z === state.topZ ? state : focus();
    case "OPEN":
      return focus({ open: true, minimized: false });
    case "CLOSE":
      return {
        ...state,
        windows: { ...state.windows, [action.id]: { ...win, open: false } },
      };
    case "MINIMIZE":
      return {
        ...state,
        windows: { ...state.windows, [action.id]: { ...win, minimized: true } },
      };
    case "RESTORE":
      return focus({ minimized: false, open: true });
    case "TOGGLE_MAX":
      return focus({ maximized: !win.maximized });
    case "MOVE":
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: { ...win, x: action.x, y: action.y },
        },
      };
    default:
      return state;
  }
}

const Ctx = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function WindowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWindows() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWindows must be used inside <WindowProvider>");
  return ctx;
}

/* ------------------------------------------------------------------ */

/**
 * Windows are a desktop idea. On a phone the terminal renders plain and
 * full-bleed instead — dragging chrome around a 375px viewport helps nobody.
 */
export function useIsDesktop(): boolean {
  const subscribe = useCallback((cb: () => void) => {
    const mq = window.matchMedia("(min-width: 900px)");
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(min-width: 900px)").matches,
    () => false, // server: assume small, upgrade after hydration
  );
}
