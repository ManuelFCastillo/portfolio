"use client";

import { RESUME_PDF } from "@/lib/resume";
import { useIsDesktop, useWindows, type WindowId } from "@/lib/windows";
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
      <div className="flex shrink-0 items-center justify-between border-t border-line bg-panel/80 px-3 py-2">
        <span className="text-[12px] text-fg-faint">
          Generated from this site — always current.
        </span>
        <a
          href={RESUME_PDF}
          download
          data-testid="preview-download"
          className="rounded border border-accent/40 bg-accent/10 px-2.5 py-1 text-[12px] text-accent transition-colors hover:bg-accent/20"
        >
          Download
        </a>
      </div>
    </div>
  );
}

/** Minimized and closed windows come back from here. */
function Dock() {
  const { state, dispatch } = useWindows();
  const hidden = state.order
    .concat("resume" as WindowId)
    .filter((id, i, arr) => arr.indexOf(id) === i)
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

export function Desktop() {
  const isDesktop = useIsDesktop();

  // Phones get the terminal plain and full-bleed. Draggable chrome on a
  // 375px viewport is worse than no chrome at all.
  if (!isDesktop) return <Terminal />;

  return (
    <div data-desktop data-testid="desktop" className="relative h-full w-full">
      <Window id="files">
        <Files />
      </Window>

      <Window id="terminal">
        <Terminal />
      </Window>

      <Window id="resume" bodyClassName="bg-[#2a2d33]">
        <ResumePreview />
      </Window>

      <Dock />
    </div>
  );
}
