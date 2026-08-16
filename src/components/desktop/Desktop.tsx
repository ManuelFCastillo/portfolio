"use client";

import { useEffect } from "react";
import { allSpecs, RESUME_PDF } from "@/lib/resume";
import { useRunner } from "@/lib/runner-context";
import { useIsDesktop, useWindows, type WindowId } from "@/lib/windows";
import { SpecDetail } from "../Report";
import { Terminal } from "../Terminal";
import { Files } from "./Files";
import { Window } from "./Window";

function ResumePreview() {
  return (
    <div className="flex h-full flex-col bg-[#2a2d33]">
      <iframe
        src={`${RESUME_PDF}#toolbar=0`}
        title="Résumé preview"
        className="min-h-0 flex-1 border-0"
      />
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-panel/80 px-3 py-2">
        <span className="truncate text-[12px] text-fg-faint">
          Generated from this site — always current.
        </span>
        <a
          href={RESUME_PDF}
          download
          data-testid="preview-download"
          className="shrink-0 rounded border border-accent/40 bg-accent/10 px-2.5 py-1 text-[12px] text-accent transition-colors hover:bg-accent/20"
        >
          Download
        </a>
      </div>
    </div>
  );
}

/** The spec window follows whatever file is currently open. */
function useActiveSpec() {
  const { state } = useRunner();
  return allSpecs.find((s) => s.id === state.activeSpecId) ?? null;
}

function SpecWindowBody() {
  const spec = useActiveSpec();
  if (!spec) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-fg-faint">
        Choose a spec file to open it here.
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto">
      <SpecDetail spec={spec} />
    </div>
  );
}

/** Minimized and closed windows come back from here. */
function Dock() {
  const { state, dispatch } = useWindows();
  const hidden = (["files", "terminal", "spec", "resume"] as WindowId[])
    .map((id) => state.windows[id])
    .filter((w) => !w.open || w.minimized);

  if (!hidden.length) return null;

  return (
    <div
      data-testid="dock"
      className="absolute bottom-3 left-1/2 z-[500] flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-panel/85 px-2 py-1.5 backdrop-blur-xl"
    >
      {hidden.map((w) => (
        <button
          key={w.id}
          onClick={() => dispatch({ type: "RESTORE", id: w.id })}
          className="rounded-full px-3 py-1 text-[12px] text-fg-dim transition-colors hover:bg-panel-hi hover:text-accent"
        >
          {w.id}
        </button>
      ))}
    </div>
  );
}

/**
 * Phones get the same windows, one at a time, with a switcher instead of
 * chrome. Dragging and resizing a window on a 375px screen is worse than not
 * having windows at all — but losing access to Files and the résumé was worse
 * still, which is what the terminal-only fallback did.
 */
function MobileShell() {
  const { state, dispatch } = useWindows();
  const spec = useActiveSpec();

  const order: WindowId[] = ["terminal", "files", "spec", "resume"];
  const openWindows = order.filter((id) => state.windows[id].open);
  const focused =
    openWindows.reduce<WindowId | null>(
      (top, id) =>
        top === null || state.windows[id].z > state.windows[top].z ? id : top,
      null,
    ) ?? "terminal";

  const label: Record<WindowId, string> = {
    terminal: "Terminal",
    files: "Files",
    spec: spec ? spec.title : "Spec",
    resume: "Résumé",
  };

  const body: Record<WindowId, React.ReactNode> = {
    terminal: <Terminal />,
    files: <Files />,
    spec: <SpecWindowBody />,
    resume: <ResumePreview />,
  };

  return (
    <div data-desktop data-testid="mobile-shell" className="flex h-full flex-col">
      <div
        role="tablist"
        aria-label="Windows"
        data-testid="mobile-switcher"
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-panel/60 px-2 py-1.5"
      >
        {openWindows.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={focused === id}
            data-testid={`mobile-tab-${id}`}
            onClick={() => dispatch({ type: "FOCUS", id })}
            className={`shrink-0 rounded px-2.5 py-1 text-[12px] whitespace-nowrap transition-colors ${
              focused === id
                ? "bg-panel-hi text-fg-strong"
                : "text-fg-dim hover:text-fg"
            }`}
          >
            {label[id]}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">{body[focused]}</div>
    </div>
  );
}

export function Desktop() {
  const isDesktop = useIsDesktop();
  const { state } = useRunner();
  const { state: windows, dispatch } = useWindows();
  const spec = useActiveSpec();

  // Opening a file anywhere — Files, or `open` in the terminal — surfaces the
  // spec window rather than switching tabs.
  const activeSpecId = state.activeSpecId;
  const specOpen = windows.windows.spec.open;
  useEffect(() => {
    if (activeSpecId && !specOpen) dispatch({ type: "OPEN", id: "spec" });
  }, [activeSpecId, specOpen, dispatch]);

  if (!isDesktop) return <MobileShell />;

  return (
    <div data-desktop data-testid="desktop" className="relative h-full w-full">
      <Window id="files">
        <Files />
      </Window>

      <Window id="terminal">
        <Terminal />
      </Window>

      <Window id="spec" title={spec ? spec.file : "spec"}>
        <SpecWindowBody />
      </Window>

      <Window id="resume" bodyClassName="bg-[#2a2d33]">
        <ResumePreview />
      </Window>

      <Dock />
    </div>
  );
}
