"use client";

import { useEffect, useState } from "react";
import {
  loadCiRun,
  relativeTime,
  WORKFLOW_URL,
  type CiRun,
} from "@/lib/ci";

export function useCiRun() {
  const [run, setRun] = useState<CiRun | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );

  useEffect(() => {
    let alive = true;
    loadCiRun().then((r) => {
      if (!alive) return;
      setRun(r);
      setState(r ? "ready" : "unavailable");
    });
    return () => {
      alive = false;
    };
  }, []);

  return { run, state };
}

const dot: Record<string, string> = {
  success: "bg-pass",
  failure: "bg-fail",
  cancelled: "bg-fg-faint",
  unknown: "bg-fg-faint",
};

const label: Record<string, string> = {
  success: "passing",
  failure: "failing",
  cancelled: "cancelled",
  unknown: "unknown",
};

/** Compact live badge for the status bar. */
export function CiBadge() {
  const { run, state } = useCiRun();

  if (state === "loading") {
    return (
      <span
        data-testid="ci-badge"
        data-ci-state="loading"
        className="flex items-center gap-1.5 text-fg-faint"
      >
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-fg-faint" />
        CI
      </span>
    );
  }

  if (!run) {
    return (
      <a
        href={WORKFLOW_URL}
        target="_blank"
        rel="noreferrer"
        data-testid="ci-badge"
        data-ci-state="unavailable"
        className="flex items-center gap-1.5 text-fg-faint transition-colors hover:text-accent"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-fg-faint" />
        CI
      </a>
    );
  }

  return (
    <a
      href={run.url}
      target="_blank"
      rel="noreferrer"
      data-testid="ci-badge"
      data-ci-state={run.conclusion}
      title={`Run #${run.runNumber} on ${run.branch} — ${relativeTime(run.finishedAt)}`}
      className="flex items-center gap-1.5 text-fg-dim transition-colors hover:text-accent"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dot[run.conclusion]}`}
        style={
          run.conclusion === "success"
            ? { boxShadow: "0 0 8px var(--glow-pass)" }
            : undefined
        }
      />
      <span>CI {label[run.conclusion]}</span>
      {run.shaShort && (
        <span className="hidden text-fg-faint md:inline">{run.shaShort}</span>
      )}
    </a>
  );
}

/** Expanded form, rendered by the `ci` terminal command. */
export function CiReport() {
  const { run, state } = useCiRun();

  if (state === "loading") {
    return (
      <div className="my-1 text-fg-dim" data-testid="ci-report">
        Querying GitHub Actions…
      </div>
    );
  }

  if (!run) {
    return (
      <div className="my-1 space-y-1" data-testid="ci-report">
        <p className="text-warn">
          No completed run available (the API is anonymous and rate-limited to
          60 requests/hour).
        </p>
        <a
          href={WORKFLOW_URL}
          target="_blank"
          rel="noreferrer"
          className="text-accent underline decoration-accent/30 underline-offset-4 hover:text-fg-strong"
        >
          {WORKFLOW_URL}
        </a>
      </div>
    );
  }

  const rows: [string, React.ReactNode][] = [
    [
      "conclusion",
      <span
        key="c"
        className={run.conclusion === "success" ? "text-pass" : "text-fail"}
      >
        {run.conclusion}
      </span>,
    ],
  ];

  // Test counts only exist when the pipeline published the status itself.
  if (run.passed !== null) {
    rows.push([
      "tests",
      <span key="t">
        <span className="text-pass">{run.passed} passed</span>
        {run.failed ? (
          <span className="text-fail">, {run.failed} failed</span>
        ) : null}
      </span>,
    ]);
  }

  rows.push(
    ["run", run.runNumber ? `#${run.runNumber}` : "—"],
    ["branch", run.branch],
    ["commit", run.shaShort || "—"],
    ["duration", run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : "—"],
    ["finished", relativeTime(run.finishedAt)],
  );

  return (
    <div className="my-2 space-y-1" data-testid="ci-report">
      <p className="text-fg-dim">
        Playwright, run against this site by GitHub Actions
        {run.source === "api" && (
          <span className="text-fg-faint"> (via the Actions API)</span>
        )}
        :
      </p>
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-3">
          <span className="w-24 shrink-0 text-fg-faint">{k}</span>
          <span className="text-fg">{v}</span>
        </div>
      ))}
      <a
        href={run.url}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-block text-accent underline decoration-accent/30 underline-offset-4 hover:text-fg-strong"
      >
        view the run →
      </a>
    </div>
  );
}
