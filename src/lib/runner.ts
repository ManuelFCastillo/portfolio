/**
 * The runner: a small state machine that executes the résumé.
 *
 * Both surfaces — the terminal and the HTML report — dispatch into this same
 * reducer and read from this same state. Clicking a spec in the report emits
 * the equivalent command into the terminal; typing that command moves the
 * report. There is exactly one source of truth about what is running, what
 * passed, and what is currently open.
 */

import { allSpecs, allTests, profile, suites, type Spec } from "./resume";

/* ------------------------------------------------------------------ */
/* Output lines                                                        */
/* ------------------------------------------------------------------ */

export type Tone = "default" | "dim" | "pass" | "fail" | "accent" | "warn";

export type Line =
  | { id: number; kind: "cmd"; text: string }
  | { id: number; kind: "text"; text: string; tone?: Tone }
  | { id: number; kind: "banner"; text: string }
  | { id: number; kind: "specHeader"; specId: string }
  | { id: number; kind: "test"; testId: string; index: number }
  | { id: number; kind: "failureBlock"; testId: string }
  | { id: number; kind: "summary"; passed: number; failed: number; ms: number }
  | { id: number; kind: "coverage" }
  | { id: number; kind: "contact" }
  | { id: number; kind: "resume" }
  | { id: number; kind: "listing"; paths: string[] }
  | { id: number; kind: "source" }
  | { id: number; kind: "ci" }
  | { id: number; kind: "help" }
  | { id: number; kind: "rule" };

/** `Omit` collapses a union to its shared keys; this keeps each member intact. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export type LineSpec = DistributiveOmit<Line, "id">;

type QueuedLine = { line: LineSpec; delay: number };

export type View = "terminal" | "report";

export interface RunnerState {
  lines: Line[];
  queue: QueuedLine[];
  nextId: number;
  running: boolean;
  /** Per-test outcome. Tests are `pending` until the runner reaches them. */
  status: Record<string, "pending" | "passed" | "failed">;
  /** Spec currently open in the trace viewer. */
  activeSpecId: string | null;
  activeTestId: string | null;
  view: View;
  history: string[];
  /** Has the suite been run at least once this session? */
  hasRun: boolean;
  lastFilter: string | null;
}

export type Action =
  | { type: "SUBMIT"; text: string }
  | { type: "TICK" }
  | { type: "FLUSH" }
  | { type: "OPEN_SPEC"; specId: string; echo?: boolean }
  | { type: "CLOSE_SPEC" }
  | { type: "OPEN_TEST"; testId: string | null }
  | { type: "SET_VIEW"; view: View }
  | { type: "AUTORUN" };

/* ------------------------------------------------------------------ */
/* Timing                                                              */
/* ------------------------------------------------------------------ */

/** Real durations are displayed; wall-clock is compressed by this factor. */
const SPEED = 14;
const MIN_DELAY = 42;
const MAX_DELAY = 210;

const scaled = (ms: number) =>
  Math.max(MIN_DELAY, Math.min(MAX_DELAY, Math.round(ms / SPEED)));

/* ------------------------------------------------------------------ */
/* Initial state                                                       */
/* ------------------------------------------------------------------ */

const pendingStatus = (): RunnerState["status"] =>
  Object.fromEntries(allTests.map((t) => [t.id, "pending" as const]));

export const initialState: RunnerState = {
  lines: [],
  queue: [],
  nextId: 0,
  running: false,
  status: pendingStatus(),
  activeSpecId: null,
  activeTestId: null,
  // The report leads: most visitors want to read, not watch a demo. The run
  // still plays inside it — assertions tick from pending to passed live — so
  // the concept survives without gating the résumé behind a performance.
  view: "report",
  history: [],
  hasRun: false,
  lastFilter: null,
};

/* ------------------------------------------------------------------ */
/* Command parsing                                                     */
/* ------------------------------------------------------------------ */

export interface ParsedCommand {
  name: string;
  args: string[];
  flags: Record<string, string | true>;
}

export function tokenize(input: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

export function parse(input: string): ParsedCommand {
  let tokens = tokenize(input.trim());

  // Accept the natural ways someone would actually type this.
  if (tokens[0] === "npx" || tokens[0] === "npm" || tokens[0] === "pnpm") {
    tokens = tokens.slice(1);
    if (tokens[0] === "run") tokens = tokens.slice(1);
  }
  if (tokens[0] === "playwright" || tokens[0] === "manny") tokens = tokens.slice(1);

  const name = (tokens[0] ?? "").toLowerCase();
  const args: string[] = [];
  const flags: Record<string, string | true> = {};

  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith("--") || (t.startsWith("-") && t.length === 2)) {
      const key = t.replace(/^-+/, "");
      const next = tokens[i + 1];
      if (next && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      args.push(t);
    }
  }

  return { name, args, flags };
}

export const COMMANDS = [
  "test",
  "report",
  "open",
  "ls",
  "cat",
  "coverage",
  "skills",
  "contact",
  "hire",
  "ci",
  "source",
  "whoami",
  "help",
  "clear",
] as const;

/** Completion candidates for tab. */
export function completions(input: string): string[] {
  const trimmed = input.trimStart();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) {
    return COMMANDS.filter((c) => c.startsWith(parts[0] ?? "")).map(String);
  }
  const last = parts[parts.length - 1];
  const paths = [
    ...allSpecs.map((s) => s.file),
    ...allSpecs.map((s) => s.id),
    "resume.md",
    "README.md",
  ];
  return paths.filter((p) => p.startsWith(last));
}

/* ------------------------------------------------------------------ */
/* Building a run                                                      */
/* ------------------------------------------------------------------ */

function matchSpecs(filter: string | null, onlyFailed: boolean): Spec[] {
  let specs = allSpecs;
  if (onlyFailed) {
    specs = specs
      .map((s) => ({ ...s, tests: s.tests.filter((t) => t.status === "failed") }))
      .filter((s) => s.tests.length > 0);
  }
  if (filter) {
    const f = filter.toLowerCase();
    specs = specs
      .map((s) => {
        const specMatches =
          s.id.toLowerCase().includes(f) ||
          s.file.toLowerCase().includes(f) ||
          s.title.toLowerCase().includes(f) ||
          s.org.toLowerCase().includes(f);
        const tests = specMatches
          ? s.tests
          : s.tests.filter(
              (t) =>
                t.title.toLowerCase().includes(f) ||
                (t.tags ?? []).some((g) => g.toLowerCase().includes(f)),
            );
        return { ...s, tests };
      })
      .filter((s) => s.tests.length > 0);
  }
  return specs;
}

function buildRun(specs: Spec[]): QueuedLine[] {
  const q: QueuedLine[] = [];
  const count = specs.reduce((a, s) => a + s.tests.length, 0);

  if (count === 0) {
    q.push({ line: { kind: "text", text: "No tests found.", tone: "warn" }, delay: 120 });
    return q;
  }

  q.push({
    line: { kind: "banner", text: `Running ${count} test${count === 1 ? "" : "s"} using 4 workers` },
    delay: 260,
  });
  q.push({ line: { kind: "text", text: "" }, delay: 40 });

  let index = 0;
  let total = 0;
  for (const spec of specs) {
    q.push({ line: { kind: "specHeader", specId: spec.id }, delay: 190 });
    for (const t of spec.tests) {
      index++;
      total += t.duration;
      q.push({ line: { kind: "test", testId: t.id, index }, delay: scaled(t.duration) });
    }
    q.push({ line: { kind: "text", text: "" }, delay: 60 });
  }

  const failing = specs.flatMap((s) => s.tests).filter((t) => t.status === "failed");
  for (const t of failing) {
    q.push({ line: { kind: "failureBlock", testId: t.id }, delay: 420 });
  }

  const passed = count - failing.length;
  q.push({
    line: { kind: "summary", passed, failed: failing.length, ms: Math.round(total / 4) },
    delay: 340,
  });

  return q;
}

/* ------------------------------------------------------------------ */
/* Command execution                                                   */
/* ------------------------------------------------------------------ */

function findSpec(query: string): Spec | undefined {
  const q = query.toLowerCase().replace(/^\.?\//, "");
  return allSpecs.find(
    (s) =>
      s.id.toLowerCase() === q ||
      s.file.toLowerCase() === q ||
      s.file.toLowerCase().endsWith(q) ||
      s.title.toLowerCase() === q,
  );
}

interface ExecResult {
  queue: QueuedLine[];
  patch?: Partial<RunnerState>;
  clear?: boolean;
}

function execute(input: string): ExecResult {
  const { name, args, flags } = parse(input);

  if (!name) return { queue: [] };

  switch (name) {
    case "test":
    case "t": {
      const filter =
        (typeof flags.grep === "string" && flags.grep) ||
        (typeof flags.g === "string" && flags.g) ||
        args[0] ||
        null;
      const onlyFailed = flags.failed === true || flags["last-failed"] === true;
      const specs = matchSpecs(filter, onlyFailed);
      return {
        queue: buildRun(specs),
        patch: { running: true, hasRun: true, lastFilter: filter },
      };
    }

    case "report":
      return {
        queue: [
          {
            line: { kind: "text", text: "Opening HTML report…", tone: "dim" },
            delay: 90,
          },
        ],
        patch: { view: "report" },
      };

    case "open": {
      const spec = args[0] ? findSpec(args[0]) : undefined;
      if (!spec) {
        return {
          queue: [
            {
              line: {
                kind: "text",
                text: args[0]
                  ? `open: ${args[0]}: no such spec`
                  : "usage: open <spec>",
                tone: "fail",
              },
              delay: 80,
            },
          ],
        };
      }
      return {
        queue: [
          {
            line: { kind: "text", text: `Opening trace for ${spec.file}…`, tone: "dim" },
            delay: 90,
          },
        ],
        patch: { view: "report", activeSpecId: spec.id, activeTestId: null },
      };
    }

    case "ls": {
      const target = (args[0] ?? "").replace(/\/$/, "").toLowerCase();
      let paths: string[];
      if (!target) {
        paths = [...suites.map((s) => `${s.title}/`), "resume.md", "README.md"];
      } else {
        const suite = suites.find((s) => s.title.toLowerCase() === target);
        paths = suite
          ? suite.specs.map((s) => s.file)
          : [];
        if (!paths.length) {
          return {
            queue: [
              {
                line: { kind: "text", text: `ls: ${args[0]}: no such directory`, tone: "fail" },
                delay: 80,
              },
            ],
          };
        }
      }
      return { queue: [{ line: { kind: "listing", paths }, delay: 110 }] };
    }

    case "cat": {
      const target = (args[0] ?? "").toLowerCase();
      if (!target) {
        return {
          queue: [{ line: { kind: "text", text: "usage: cat <file>", tone: "fail" }, delay: 80 }],
        };
      }
      if (target === "resume.md" || target === "readme.md" || target === "resume") {
        return { queue: [{ line: { kind: "resume" }, delay: 140 }] };
      }
      const spec = findSpec(target);
      if (spec) {
        return {
          queue: [
            { line: { kind: "text", text: `Opening trace for ${spec.file}…`, tone: "dim" }, delay: 90 },
          ],
          patch: { view: "report", activeSpecId: spec.id, activeTestId: null },
        };
      }
      return {
        queue: [
          { line: { kind: "text", text: `cat: ${args[0]}: no such file`, tone: "fail" }, delay: 80 },
        ],
      };
    }

    case "coverage":
    case "skills":
      return { queue: [{ line: { kind: "coverage" }, delay: 160 }] };

    case "contact":
    case "hire":
      return { queue: [{ line: { kind: "contact" }, delay: 120 }] };

    case "ci":
    case "pipeline":
      return { queue: [{ line: { kind: "ci" }, delay: 130 }] };

    case "source":
      return { queue: [{ line: { kind: "source" }, delay: 140 }] };

    case "whoami":
      return {
        queue: [
          { line: { kind: "text", text: profile.name, tone: "accent" }, delay: 70 },
          { line: { kind: "text", text: profile.title }, delay: 60 },
          { line: { kind: "text", text: profile.headline, tone: "dim" }, delay: 60 },
        ],
      };

    case "help":
    case "?":
      return { queue: [{ line: { kind: "help" }, delay: 110 }] };

    case "clear":
      return { queue: [], clear: true };

    default:
      return {
        queue: [
          {
            line: {
              kind: "text",
              text: `command not found: ${name}. Type 'help' for available commands.`,
              tone: "fail",
            },
            delay: 90,
          },
        ],
      };
  }
}

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

function withIds(
  queue: QueuedLine[],
  startId: number,
): { lines: Line[]; nextId: number } {
  const lines = queue.map((q, i) => ({ ...q.line, id: startId + i }) as Line);
  return { lines, nextId: startId + queue.length };
}

/** Applies a line's side effect on the status map as it is emitted. */
function applyLine(state: RunnerState, line: Line): RunnerState {
  if (line.kind === "test") {
    const test = allTests.find((t) => t.id === line.testId);
    if (!test) return state;
    return { ...state, status: { ...state.status, [test.id]: test.status } };
  }
  return state;
}

export function reducer(state: RunnerState, action: Action): RunnerState {
  switch (action.type) {
    case "SUBMIT": {
      const text = action.text.trim();
      const cmdLine: Line = { id: state.nextId, kind: "cmd", text };
      let next: RunnerState = {
        ...state,
        lines: [...state.lines, cmdLine],
        nextId: state.nextId + 1,
        history: text ? [...state.history, text] : state.history,
      };
      if (!text) return next;

      const result = execute(text);
      if (result.clear) {
        return { ...next, lines: [], queue: [] };
      }
      next = { ...next, ...result.patch };
      // Append rather than replace: a command submitted while output is still
      // streaming must not silently swallow the previous command's output.
      return { ...next, queue: [...state.queue, ...result.queue] };
    }

    case "AUTORUN": {
      const result = execute("npx playwright test");
      const cmdLine: Line = {
        id: state.nextId,
        kind: "cmd",
        text: "npx playwright test",
      };
      return {
        ...state,
        ...result.patch,
        lines: [...state.lines, cmdLine],
        nextId: state.nextId + 1,
        queue: result.queue,
      };
    }

    case "TICK": {
      if (!state.queue.length) {
        return state.running ? { ...state, running: false } : state;
      }
      const [head, ...rest] = state.queue;
      const line = { ...head.line, id: state.nextId } as Line;
      const next: RunnerState = {
        ...state,
        lines: [...state.lines, line],
        queue: rest,
        nextId: state.nextId + 1,
        running: rest.length > 0,
      };
      return applyLine(next, line);
    }

    case "FLUSH": {
      if (!state.queue.length) return state;
      const { lines, nextId } = withIds(state.queue, state.nextId);
      let next: RunnerState = {
        ...state,
        lines: [...state.lines, ...lines],
        queue: [],
        nextId,
        running: false,
      };
      for (const l of lines) next = applyLine(next, l);
      return next;
    }

    case "OPEN_SPEC": {
      const spec = allSpecs.find((s) => s.id === action.specId);
      if (!spec) return state;
      // The GUI click writes the command it corresponds to.
      const echo = action.echo !== false;
      const lines = echo
        ? [...state.lines, { id: state.nextId, kind: "cmd", text: `open ${spec.file}` } as Line]
        : state.lines;
      return {
        ...state,
        lines,
        nextId: echo ? state.nextId + 1 : state.nextId,
        history: echo ? [...state.history, `open ${spec.file}`] : state.history,
        activeSpecId: spec.id,
        activeTestId: null,
      };
    }

    case "CLOSE_SPEC":
      return { ...state, activeSpecId: null, activeTestId: null };

    case "OPEN_TEST":
      return { ...state, activeTestId: action.testId };

    case "SET_VIEW":
      return { ...state, view: action.view };

    default:
      return state;
  }
}

/** Delay before the next queued line should be emitted. */
export function nextDelay(state: RunnerState): number | null {
  return state.queue.length ? state.queue[0].delay : null;
}
