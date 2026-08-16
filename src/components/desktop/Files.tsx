"use client";

import { useEffect, useState } from "react";
import { RESUME_PDF, suites } from "@/lib/resume";
import { useRunner } from "@/lib/runner-context";
import { useWindows } from "@/lib/windows";

type Entry =
  | { kind: "pdf"; name: string; path: string }
  | { kind: "doc"; name: string; path: string }
  | { kind: "spec"; name: string; path: string; specId: string };

interface Folder {
  name: string;
  entries: Entry[];
}

const tree: Folder[] = [
  {
    name: "~",
    entries: [
      { kind: "pdf", name: "manny-castillo-resume.pdf", path: RESUME_PDF },
      { kind: "doc", name: "resume.md", path: "resume.md" },
    ],
  },
  ...suites.map((suite) => ({
    name: `${suite.title}/`,
    entries: suite.specs.map<Entry>((spec) => ({
      kind: "spec",
      name: spec.file.split("/").pop() ?? spec.file,
      path: spec.file,
      specId: spec.id,
    })),
  })),
];

const icon: Record<Entry["kind"], string> = {
  pdf: "▤",
  doc: "≡",
  spec: "◆",
};

const iconTone: Record<Entry["kind"], string> = {
  pdf: "text-fail",
  doc: "text-fg-dim",
  spec: "text-accent",
};

interface MenuState {
  x: number;
  y: number;
  entry: Entry;
}

export function Files() {
  const { dispatch } = useRunner();
  const { dispatch: windows } = useWindows();
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  // Any click elsewhere, or Escape, dismisses the context menu.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  function open(entry: Entry) {
    setMenu(null);
    if (entry.kind === "pdf") {
      windows({ type: "OPEN", id: "resume" });
      return;
    }
    if (entry.kind === "doc") {
      // Cross-window: the command lands in the terminal, as if typed.
      dispatch({ type: "SUBMIT", text: "cat resume.md" });
      windows({ type: "OPEN", id: "terminal" });
      return;
    }
    dispatch({ type: "OPEN_SPEC", specId: entry.specId });
    dispatch({ type: "SET_VIEW", view: "report" });
  }

  function download(entry: Entry) {
    setMenu(null);
    const a = document.createElement("a");
    a.href = entry.path;
    a.download = entry.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="relative h-full overflow-y-auto px-2 py-2 text-[13px]">
      {tree.map((folder) => (
        <div key={folder.name} className="mb-2">
          <p className="px-2 py-1 text-[11px] tracking-[0.1em] text-fg-faint uppercase">
            {folder.name}
          </p>
          {folder.entries.map((entry) => (
            <button
              key={entry.path}
              data-testid="file-entry"
              data-kind={entry.kind}
              onClick={() => {
                setSelected(entry.path);
                open(entry);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setSelected(entry.path);
                // Viewport coordinates, to match position: fixed below.
                setMenu({ x: e.clientX, y: e.clientY, entry });
              }}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors ${
                selected === entry.path
                  ? "bg-accent/15 text-fg-strong"
                  : "text-fg-dim hover:bg-panel-hi"
              }`}
            >
              <span className={`shrink-0 ${iconTone[entry.kind]}`}>
                {icon[entry.kind]}
              </span>
              <span className="truncate">{entry.name}</span>
            </button>
          ))}
        </div>
      ))}

      <p className="px-2 pt-1 pb-2 text-[11px] text-fg-faint">
        Right-click for options.
      </p>

      {menu && <ContextMenu menu={menu} onOpen={open} onDownload={download} />}
    </div>
  );
}

function ContextMenu({
  menu,
  onOpen,
  onDownload,
}: {
  menu: MenuState;
  onOpen: (e: Entry) => void;
  onDownload: (e: Entry) => void;
}) {
  const items: { label: string; action: () => void }[] = [
    { label: "Open", action: () => onOpen(menu.entry) },
  ];
  if (menu.entry.kind === "pdf") {
    items.push({ label: "Download", action: () => onDownload(menu.entry) });
  }
  items.push({
    label: "Copy path",
    action: () => navigator.clipboard?.writeText(menu.entry.path),
  });

  return (
    <div
      data-testid="context-menu"
      role="menu"
      onPointerDown={(e) => e.stopPropagation()}
      style={{ position: "fixed", left: menu.x, top: menu.y }}
      className="z-[999] min-w-[168px] overflow-hidden rounded-lg border border-line bg-panel/95 py-1 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.8)] backdrop-blur-xl"
    >
      {items.map((item) => (
        <button
          key={item.label}
          role="menuitem"
          onClick={item.action}
          className="block w-full px-3 py-1.5 text-left text-[13px] text-fg-dim transition-colors hover:bg-accent/20 hover:text-fg-strong"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
