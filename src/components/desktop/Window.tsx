"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { useWindows, type WindowId } from "@/lib/windows";

/** macOS-style traffic light. Labelled, because a bare coloured dot is not a button. */
function Light({
  color,
  label,
  glyph,
  onClick,
}: {
  color: string;
  label: string;
  glyph: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`group/light flex h-3 w-3 items-center justify-center rounded-full ${color} transition-transform active:scale-90`}
    >
      <span className="text-[8px] leading-none font-bold text-black/55 opacity-0 transition-opacity group-hover/traffic:opacity-100">
        {glyph}
      </span>
    </button>
  );
}

export function Window({
  id,
  children,
  bodyClassName = "",
}: {
  id: WindowId;
  children: ReactNode;
  bodyClassName?: string;
}) {
  const { state, dispatch } = useWindows();
  const win = state.windows[id];
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (win.maximized) return;
      // Don't start a drag from the traffic lights.
      if ((e.target as HTMLElement).closest("button")) return;
      dragRef.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dispatch({ type: "FOCUS", id });
    },
    [dispatch, id, win.maximized, win.x, win.y],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const parent = (e.currentTarget as HTMLElement).closest("[data-desktop]");
      const bounds = parent?.getBoundingClientRect();
      const maxX = (bounds?.width ?? 2000) - 120;
      const maxY = (bounds?.height ?? 1200) - 40;
      dispatch({
        type: "MOVE",
        id,
        x: Math.min(Math.max(0, e.clientX - d.dx), Math.max(0, maxX)),
        y: Math.min(Math.max(0, e.clientY - d.dy), Math.max(0, maxY)),
      });
    },
    [dispatch, id],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  if (!win.open || win.minimized) return null;

  // Clamped to the desktop so a window can never hang off the bottom with its
  // footer — and its download button — out of reach.
  const geometry = win.maximized
    ? { left: 8, top: 8, width: "calc(100% - 16px)", height: "calc(100% - 16px)" }
    : {
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        maxWidth: `calc(100% - ${win.x + 16}px)`,
        maxHeight: `calc(100% - ${win.y + 16}px)`,
      };

  return (
    <section
      data-testid={`window-${id}`}
      data-maximized={win.maximized ? "true" : "false"}
      aria-label={win.title}
      style={{ ...geometry, zIndex: win.z }}
      onPointerDown={() => dispatch({ type: "FOCUS", id })}
      className="absolute flex flex-col overflow-hidden rounded-xl border border-line bg-bg-raised/95 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.75)] backdrop-blur-xl"
    >
      <header
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => dispatch({ type: "TOGGLE_MAX", id })}
        className={`group/traffic flex shrink-0 items-center gap-2 border-b border-line bg-panel/80 px-3 py-2 ${
          win.maximized ? "" : "cursor-grab active:cursor-grabbing"
        }`}
      >
        <div className="flex items-center gap-2">
          <Light
            color="bg-[#ff5f56]"
            label={`Close ${win.title}`}
            glyph="✕"
            onClick={() => dispatch({ type: "CLOSE", id })}
          />
          <Light
            color="bg-[#ffbd2e]"
            label={`Minimize ${win.title}`}
            glyph="—"
            onClick={() => dispatch({ type: "MINIMIZE", id })}
          />
          <Light
            color="bg-[#27c93f]"
            label={win.maximized ? `Restore ${win.title}` : `Zoom ${win.title}`}
            glyph="+"
            onClick={() => dispatch({ type: "TOGGLE_MAX", id })}
          />
        </div>
        <span className="pointer-events-none flex-1 truncate text-center text-[12px] text-fg-dim select-none">
          {win.title}
        </span>
        {/* Balances the traffic lights so the title sits optically centred. */}
        <div className="w-[54px] shrink-0" aria-hidden />
      </header>

      <div className={`min-h-0 flex-1 overflow-hidden ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
}
