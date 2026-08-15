"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { completions } from "@/lib/runner";
import { useRunner } from "@/lib/runner-context";
import { LineRenderer } from "./Lines";

const SUGGESTIONS = [
  "test --grep playwright",
  "ci",
  "coverage",
  "cat resume.md",
  "test --failed",
  "source",
  "help",
];

export function Terminal() {
  const { state, dispatch } = useRunner();
  const [value, setValue] = useState("");
  const [histIndex, setHistIndex] = useState(-1);
  const [hint, setHint] = useState<string[] | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Follow the output, but don't fight a user who has scrolled up to read.
  const pinnedRef = useRef(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (pinnedRef.current) {
      endRef.current?.scrollIntoView({ block: "end" });
    }
  }, [state.lines.length]);

  const focus = useCallback(() => {
    // Don't steal focus while the visitor is selecting text to copy.
    if (window.getSelection()?.toString()) return;
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    focus();
  }, [focus]);

  const submit = (text: string) => {
    dispatch({ type: "SUBMIT", text });
    setValue("");
    setHistIndex(-1);
    setHint(null);
    pinnedRef.current = true;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit(value);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const c = completions(value);
      if (c.length === 1) {
        const parts = value.split(/\s+/);
        parts[parts.length - 1] = c[0];
        setValue(parts.join(" ") + " ");
        setHint(null);
      } else if (c.length > 1) {
        setHint(c);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!state.history.length) return;
      const next = histIndex === -1 ? state.history.length - 1 : Math.max(0, histIndex - 1);
      setHistIndex(next);
      setValue(state.history[next]);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIndex === -1) return;
      const next = histIndex + 1;
      if (next >= state.history.length) {
        setHistIndex(-1);
        setValue("");
      } else {
        setHistIndex(next);
        setValue(state.history[next]);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      if (state.queue.length) dispatch({ type: "FLUSH" });
      else setValue("");
      return;
    }

    if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      submit("clear");
    }
  };

  const idle = state.queue.length === 0;

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onMouseDown={(e) => {
        // Let clicks on real controls through.
        if ((e.target as HTMLElement).closest("button,a,input")) return;
        focus();
      }}
    >
      <div
        ref={scrollRef}
        data-testid="terminal-output"
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-[13.5px] leading-[1.65] sm:px-6 sm:text-[14px]"
      >
        <div className="mx-auto max-w-5xl">
          {state.lines.map((line) => (
            <div key={line.id} className="animate-line-in">
              <LineRenderer line={line} />
            </div>
          ))}

          {/* Prompt */}
          <div className="flex items-baseline gap-2 pt-3">
            <span className="shrink-0 select-none text-accent">❯</span>
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setHint(null);
                }}
                onKeyDown={onKeyDown}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                aria-label="Command input. Type help for available commands."
                // The blinking text caret is the focus indicator here; a ring
                // around a permanently-focused terminal input is just noise.
                className="w-full bg-transparent text-fg-strong caret-accent outline-none focus-visible:outline-none placeholder:text-fg-faint"
                placeholder={idle ? "type a command — try 'help'" : ""}
              />
            </div>
          </div>

          {hint && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 pl-5 text-fg-dim">
              {hint.map((h) => (
                <button
                  key={h}
                  onClick={() => {
                    const parts = value.split(/\s+/);
                    parts[parts.length - 1] = h;
                    setValue(parts.join(" ") + " ");
                    setHint(null);
                    focus();
                  }}
                  className="hover:text-accent"
                >
                  {h}
                </button>
              ))}
            </div>
          )}

          <div ref={endRef} className="h-2" />
        </div>
      </div>

      {/* Discoverability: nobody types into a box with no affordances. */}
      <div className="no-print shrink-0 border-t border-line bg-bg-raised/70 px-4 py-2.5 backdrop-blur sm:px-6">
        {/* One scrollable row on phones; wraps freely once there's width. */}
        <div className="mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto sm:flex-wrap sm:overflow-x-visible">
          <span className="mr-1 hidden text-xs text-fg-faint sm:inline">try</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                submit(s);
                focus();
              }}
              className="shrink-0 rounded border border-line bg-panel px-2 py-1 text-xs whitespace-nowrap text-fg-dim transition-colors hover:border-accent/40 hover:bg-panel-hi hover:text-accent"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
