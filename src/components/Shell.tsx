"use client";

import { useEffect, useMemo } from "react";
import { allTests, contact, profile, totals } from "@/lib/resume";
import { useRunner } from "@/lib/runner-context";
import { REPO_URL } from "@/lib/ci";
import { CiBadge } from "./CiStatus";
import { Desktop } from "./desktop/Desktop";
import { Report } from "./Report";

function Tab({
  label,
  active,
  onClick,
  badge,
  testId,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: React.ReactNode;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-2 px-3 py-1.5 text-[12.5px] transition-colors ${
        active ? "text-fg-strong" : "text-fg-dim hover:text-fg"
      }`}
    >
      {label}
      {badge}
      {active && (
        <span className="absolute inset-x-2 -bottom-px h-px bg-accent" />
      )}
    </button>
  );
}

export function Shell() {
  const { state, dispatch } = useRunner();

  const ran = useMemo(
    () => allTests.filter((t) => state.status[t.id] !== "pending"),
    [state.status],
  );
  const passed = ran.filter((t) => t.status === "passed").length;
  const failed = ran.filter((t) => t.status === "failed").length;
  const progress = Math.round((ran.length / totals.tests) * 100);

  // Global keys: Esc skips the run from anywhere, ⌘/Ctrl+K toggles the view.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state.queue.length) {
        dispatch({ type: "FLUSH" });
      }
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        dispatch({
          type: "SET_VIEW",
          view: state.view === "terminal" ? "report" : "terminal",
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, state.queue.length, state.view]);

  return (
    <div className="no-print relative z-10 flex h-[100dvh] flex-col">
      {/* Top bar */}
      <header className="relative shrink-0 border-b border-line bg-bg-raised/80 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 py-2.5">
            <span className="truncate font-sans text-[13.5px] font-medium tracking-tight text-fg-strong">
              {profile.fullName}
            </span>
            <span className="hidden truncate text-[12px] text-fg-dim sm:inline">
              {profile.title}
            </span>
          </div>

          <div className="flex shrink-0 items-center">
            <Tab
              label="Terminal"
              testId="tab-terminal"
              active={state.view === "terminal"}
              onClick={() => dispatch({ type: "SET_VIEW", view: "terminal" })}
            />
            <Tab
              label="Report"
              testId="tab-report"
              active={state.view === "report"}
              onClick={() => dispatch({ type: "SET_VIEW", view: "report" })}
              badge={
                failed > 0 ? (
                  <span className="rounded-full bg-fail/15 px-1.5 py-0.5 text-[10.5px] leading-none text-fail">
                    {failed}
                  </span>
                ) : undefined
              }
            />
          </div>
        </div>

        {/* Run progress */}
        <div className="absolute inset-x-0 -bottom-px h-px overflow-hidden">
          <div
            className={`h-full bg-accent/70 transition-[width] duration-300 ease-out ${
              state.queue.length ? "shimmer relative" : ""
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Body */}
      <main className="min-h-0 flex-1">
        {state.view === "terminal" ? <Desktop /> : <Report />}
      </main>

      {/* Status bar */}
      <footer className="shrink-0 border-t border-line bg-bg-raised/80 px-4 py-1.5 backdrop-blur sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11.5px]">
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                state.queue.length
                  ? "animate-pulse-soft bg-accent"
                  : failed > 0
                    ? "bg-fail"
                    : "bg-pass"
              }`}
            />
            <span className="text-fg-dim" data-testid="run-state">
              {state.queue.length ? "running" : "idle"}
            </span>
          </span>

          <span className="tabular-nums text-pass" data-testid="passed-count">
            {passed} passed
          </span>
          {failed > 0 && (
            <span className="tabular-nums text-fail" data-testid="failed-count">
              {failed} failed
            </span>
          )}

          {/* Not decoration: this is the real conclusion of the real
              Playwright suite that runs against this site. */}
          <span className="ml-auto flex items-center gap-4 text-fg-faint">
            <CiBadge />
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden text-fg-dim transition-colors hover:text-accent lg:inline"
            >
              source
            </a>
            <span className="hidden sm:inline">⌘K view</span>
            <span className="hidden sm:inline">Esc skip</span>
            <a
              href={`mailto:${contact.email}`}
              className="hidden text-fg-dim transition-colors hover:text-accent md:inline"
            >
              {contact.email}
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
