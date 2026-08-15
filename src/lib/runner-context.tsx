"use client";

/**
 * Provider that drives the runner clock and shares one state between the
 * terminal and the report.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import { initialState, nextDelay, reducer, type Action, type RunnerState } from "./runner";

interface RunnerContextValue {
  state: RunnerState;
  dispatch: Dispatch<Action>;
}

const RunnerContext = createContext<RunnerContextValue | null>(null);

export function useRunner(): RunnerContextValue {
  const ctx = useContext(RunnerContext);
  if (!ctx) throw new Error("useRunner must be used inside <RunnerProvider>");
  return ctx;
}

export function RunnerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const reducedMotionRef = useRef(false);
  const started = useRef(false);

  // Respect the OS setting: no theatrics, just the finished output.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    if (started.current) return;
    started.current = true;
    dispatch({ type: "AUTORUN" });
    if (mq.matches) {
      // Let AUTORUN populate the queue, then emit it all at once.
      queueMicrotask(() => dispatch({ type: "FLUSH" }));
    }
  }, []);

  // The clock. One timer, rescheduled per line.
  useEffect(() => {
    const delay = nextDelay(state);
    if (delay === null) return;
    if (reducedMotionRef.current) {
      dispatch({ type: "FLUSH" });
      return;
    }
    const id = window.setTimeout(() => dispatch({ type: "TICK" }), delay);
    return () => window.clearTimeout(id);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <RunnerContext.Provider value={value}>{children}</RunnerContext.Provider>;
}
