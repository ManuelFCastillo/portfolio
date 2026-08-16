"use client";

import {
  allSpecs,
  allTests,
  contact,
  profile,
  RESUME_PDF,
  skillGroups,
} from "@/lib/resume";
import type { Line, Tone } from "@/lib/runner";
import { useRunner } from "@/lib/runner-context";
import { CiReport } from "./CiStatus";
import { Phone } from "./Phone";
import { REPO_URL } from "@/lib/ci";

const fmt = (ms: number) => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);

const toneClass: Record<Tone, string> = {
  default: "text-fg",
  dim: "text-fg-dim",
  pass: "text-pass",
  fail: "text-fail",
  accent: "text-accent",
  warn: "text-warn",
};

/* ------------------------------------------------------------------ */

function CmdLine({ text }: { text: string }) {
  return (
    <div className="flex gap-2 pt-3 pb-1">
      <span className="shrink-0 select-none text-accent">❯</span>
      <span className="text-fg-strong">{text}</span>
    </div>
  );
}

function Banner({ text }: { text: string }) {
  return (
    <div className="py-1 font-medium tracking-tight text-fg-strong">
      {text}
    </div>
  );
}

function SpecHeader({ specId }: { specId: string }) {
  const spec = allSpecs.find((s) => s.id === specId);
  const { dispatch } = useRunner();
  if (!spec) return null;
  return (
    <button
      onClick={() => dispatch({ type: "OPEN_SPEC", specId })}
      className="group mt-2 flex w-full flex-wrap items-baseline gap-x-3 gap-y-0.5 text-left transition-colors"
      title={`Open trace for ${spec.file}`}
    >
      <span className="text-fg-dim transition-colors group-hover:text-accent">
        {spec.file}
      </span>
      <span className="text-xs text-fg-faint">
        {spec.org} · {spec.period}
      </span>
    </button>
  );
}

function TestLine({ testId, index }: { testId: string; index: number }) {
  const test = allTests.find((t) => t.id === testId);
  const spec = allSpecs.find((s) => s.tests.some((t) => t.id === testId));
  const { dispatch } = useRunner();
  if (!test || !spec) return null;

  const failed = test.status === "failed";

  return (
    <button
      onClick={() => {
        dispatch({ type: "OPEN_SPEC", specId: spec.id, echo: false });
        dispatch({ type: "OPEN_TEST", testId });
        dispatch({ type: "SET_VIEW", view: "report" });
      }}
      data-testid="test-line"
      data-status={test.status}
      aria-label={`${failed ? "Failed" : "Passed"}: ${test.title}. ${fmt(test.duration)}. Open in report.`}
      className="group flex w-full items-baseline gap-2 rounded-sm py-[1px] pr-2 text-left transition-colors hover:bg-panel-hi/60"
    >
      <span
        className={`w-4 shrink-0 select-none text-center ${failed ? "text-fail" : "text-pass"}`}
        style={failed ? { textShadow: "0 0 12px var(--glow-fail)" } : undefined}
      >
        {failed ? "✘" : "✓"}
      </span>
      <span className="w-6 shrink-0 select-none text-right text-fg-faint tabular-nums">
        {index}
      </span>
      <span className="shrink-0 select-none text-fg-faint">›</span>
      <span
        className={`flex-1 ${failed ? "text-fail" : "text-fg"} group-hover:text-fg-strong`}
      >
        {test.title}
      </span>
      <span className="shrink-0 tabular-nums text-fg-faint">{fmt(test.duration)}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* The failure — the whole point of the site                           */
/* ------------------------------------------------------------------ */

function FailureBlock({ testId }: { testId: string }) {
  const test = allTests.find((t) => t.id === testId);
  if (!test?.failure) return null;
  const f = test.failure;

  return (
    <div
      data-testid="failure-block"
      className="animate-rise-in my-4 overflow-hidden rounded-md border border-fail/30 bg-fail/[0.04]"
    >
      <div className="flex flex-wrap items-center gap-x-2 border-b border-fail/20 bg-fail/[0.07] px-3 py-2">
        <span className="text-fail">1)</span>
        <span className="text-fail/80">{f.location}</span>
        <span className="text-fg-faint">›</span>
        <span className="text-fg-strong">{test.title}</span>
      </div>

      <div className="space-y-3 px-3 py-3 sm:px-5">
        <p className="text-fail">Error: {f.matcher}</p>

        <div className="space-y-0.5">
          <p>
            <span className="text-fg-dim">Expected: </span>
            <span className="text-pass">{f.expected}</span>
          </p>
          <p>
            <span className="text-fg-dim">Received: </span>
            <span className="text-fail">{f.received}</span>
          </p>
        </div>

        <pre className="overflow-x-auto rounded border border-line bg-bg/70 p-3 text-[13px] leading-relaxed">
          {f.codeFrame.map((l) => (
            <div key={l.n} className={l.highlight ? "text-fg-strong" : "text-fg-dim"}>
              <span className={l.highlight ? "text-fail" : "text-transparent"}>
                {l.highlight ? ">" : " "}
              </span>
              <span className="select-none text-fg-faint">
                {" "}
                {String(l.n).padStart(2, " ")} |{" "}
              </span>
              <span>{l.text}</span>
              {l.highlight && l.caret !== undefined && (
                <>
                  {"\n"}
                  {/* Gutter must match the line gutter exactly: ">" + " NN | " */}
                  <span className="select-none text-fg-faint">{"     | "}</span>
                  <span className="text-fail">
                    {" ".repeat(l.caret)}^
                  </span>
                </>
              )}
            </div>
          ))}
        </pre>

        <div className="space-y-1 pt-1">
          <p className="text-fg-dim">Resolve at:</p>
          <ul className="space-y-1 pl-4">
            {f.trace.map((t) => (
              <li key={t.href}>
                <a
                  href={t.href}
                  target={t.href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:text-fg-strong hover:decoration-accent"
                >
                  {t.label}
                </a>
              </li>
            ))}
            <li>
              <Phone />
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Summary({ passed, failed, ms }: { passed: number; failed: number; ms: number }) {
  return (
    <div
      data-testid="summary"
      className="animate-rise-in mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line pt-3"
    >
      {failed > 0 && (
        <span className="font-medium text-fail">
          {failed} failed
        </span>
      )}
      <span className="font-medium text-pass">{passed} passed</span>
      <span className="text-fg-faint tabular-nums">({fmt(ms)})</span>
      {failed > 0 && (
        <span className="text-fg-dim">
          — the failing test is the only one you can fix.
        </span>
      )}
    </div>
  );
}

function Coverage() {
  const w = (n: number) =>
    n >= 95 ? "text-pass" : n >= 88 ? "text-warn" : "text-fail";
  return (
    <div className="animate-fade-in my-2 overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line text-fg-dim">
            <th className="py-1.5 pr-4 text-left font-normal">File</th>
            <th className="py-1.5 pr-4 text-right font-normal">% Stmts</th>
            <th className="py-1.5 pr-4 text-right font-normal">% Branch</th>
            <th className="py-1.5 pr-4 text-right font-normal">% Funcs</th>
            <th className="py-1.5 text-left font-normal">Covered</th>
          </tr>
        </thead>
        <tbody>
          {skillGroups.map((g) => (
            <tr key={g.id} className="border-b border-line-soft align-top">
              <td className="py-1.5 pr-4 whitespace-nowrap text-fg">{g.file}</td>
              <td className={`py-1.5 pr-4 text-right tabular-nums ${w(g.coverage.stmts)}`}>
                {g.coverage.stmts.toFixed(1)}
              </td>
              <td className={`py-1.5 pr-4 text-right tabular-nums ${w(g.coverage.branch)}`}>
                {g.coverage.branch.toFixed(1)}
              </td>
              <td className={`py-1.5 pr-4 text-right tabular-nums ${w(g.coverage.funcs)}`}>
                {g.coverage.funcs.toFixed(1)}
              </td>
              <td className="py-1.5 text-fg-dim">{g.items.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Contact() {
  const rows = [
    { k: "email", v: contact.email, href: `mailto:${contact.email}` },
    { k: "linkedin", v: contact.linkedin, href: contact.linkedinUrl },
    { k: "résumé", v: "download (PDF)", href: RESUME_PDF },
    { k: "location", v: "Austin, TX · Remote", href: null },
    { k: "status", v: "Available immediately", href: null },
  ];
  return (
    <div className="animate-fade-in my-2 space-y-1">
      <div className="flex gap-3">
        <span className="w-20 shrink-0 text-fg-faint">phone</span>
        <Phone />
      </div>
      {rows.map((r) => (
        <div key={r.k} className="flex gap-3">
          <span className="w-20 shrink-0 text-fg-faint">{r.k}</span>
          {r.href ? (
            <a
              href={r.href}
              target={r.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="text-accent underline decoration-accent/30 underline-offset-4 hover:text-fg-strong"
            >
              {r.v}
            </a>
          ) : (
            <span className={r.k === "status" ? "text-pass" : "text-fg"}>{r.v}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ResumeText() {
  const career = allSpecs.filter((s) => s.id !== "education" && s.id !== "availability");
  return (
    <div className="animate-fade-in my-2 max-w-3xl space-y-4">
      <div>
        <p className="text-fg-strong"># {profile.name}</p>
        <p className="text-fg-dim">{profile.title}</p>
        <a
          href={RESUME_PDF}
          download
          className="text-accent underline decoration-accent/30 underline-offset-4 hover:text-fg-strong"
        >
          download as PDF →
        </a>
      </div>
      <p className="leading-relaxed text-fg">{profile.summary}</p>
      {career.map((s) => (
        <div key={s.id} className="space-y-1">
          <p className="text-accent">## {s.role}</p>
          <p className="text-fg-dim">
            {s.org} · {s.location} · {s.period}
          </p>
          <ul className="space-y-0.5 pl-4">
            {s.tests.map((t) => (
              <li key={t.id} className="text-fg">
                <span className="text-fg-faint">- </span>
                {t.title}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Listing({ paths }: { paths: string[] }) {
  const { dispatch } = useRunner();
  return (
    <div className="animate-fade-in my-1 flex flex-wrap gap-x-6 gap-y-1">
      {paths.map((p) => {
        const spec = allSpecs.find((s) => s.file === p);
        return spec ? (
          <button
            key={p}
            onClick={() => dispatch({ type: "OPEN_SPEC", specId: spec.id })}
            className="text-accent underline decoration-accent/25 underline-offset-4 hover:text-fg-strong"
          >
            {p}
          </button>
        ) : (
          <span key={p} className={p.endsWith("/") ? "text-violet" : "text-fg"}>
            {p}
          </span>
        );
      })}
    </div>
  );
}

/** The self-referential bit: the site can show you how it's built. */
function Source() {
  const snippet = `// src/lib/resume.ts — the whole site reads from this tree.

export interface Test {
  id: string;
  title: string;      // written as an assertion
  duration: number;   // displayed; wall-clock is compressed 14x
  status: "passed" | "failed";
  failure?: TestFailure;
}

const availability: Spec = {
  file: "availability.spec.ts",
  tests: [
    {
      title: "candidate is off the market",
      status: "failed",                     // <- the only one
      failure: {
        expected: '"unavailable"',
        received: '"available immediately"',
      },
    },
  ],
};`;
  return (
    <div className="animate-fade-in my-2 space-y-2">
      <p className="text-fg-dim">
        There is no mock data layer. The terminal and the report are two
        renderers over one reducer:
      </p>
      <pre className="overflow-x-auto rounded border border-line bg-bg/70 p-3 text-[12.5px] leading-relaxed text-fg-dim">
        {snippet}
      </pre>
      <p className="text-fg-dim">
        All of it — including the Playwright suite that tests this page and the
        CI workflow that runs it — is public:
      </p>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-block text-accent underline decoration-accent/30 underline-offset-4 hover:text-fg-strong"
      >
        {REPO_URL.replace("https://", "")}
      </a>
      <p className="text-fg-faint">
        Run <span className="text-fg-dim">ci</span> for the live result of that
        suite.
      </p>
    </div>
  );
}

function Help() {
  const rows: [string, string][] = [
    ["test", "run the full suite"],
    ["test --grep <term>", "run tests matching a term (try: playwright, aws, go)"],
    ["test --failed", "re-run only the failing test"],
    ["ls / ls career", "list spec files"],
    ["open <spec>", "open a spec in the trace viewer"],
    ["cat resume.md", "print the résumé as text"],
    ["coverage", "skills, as a coverage report"],
    ["contact", "how to reach me"],
    ["ci", "live status of the real Playwright suite for this site"],
    ["source", "how this site is built"],
    ["report", "switch to the HTML report"],
    ["clear", "clear the screen"],
  ];
  return (
    <div className="animate-fade-in my-2 space-y-2">
      <div className="space-y-0.5">
        {rows.map(([cmd, desc]) => (
          <div key={cmd} className="flex flex-col gap-x-4 sm:flex-row">
            <span className="w-56 shrink-0 text-accent">{cmd}</span>
            <span className="text-fg-dim">{desc}</span>
          </div>
        ))}
      </div>
      <p className="pt-1 text-fg-faint">
        Tab completes · ↑ ↓ history · Esc skips the animation
      </p>
    </div>
  );
}

function TextLine({ text, tone }: { text: string; tone?: Tone }) {
  if (!text) return <div className="h-3" aria-hidden />;
  return <div className={toneClass[tone ?? "default"]}>{text}</div>;
}

/* ------------------------------------------------------------------ */

export function LineRenderer({ line }: { line: Line }) {
  switch (line.kind) {
    case "cmd":
      return <CmdLine text={line.text} />;
    case "banner":
      return <Banner text={line.text} />;
    case "specHeader":
      return <SpecHeader specId={line.specId} />;
    case "test":
      return <TestLine testId={line.testId} index={line.index} />;
    case "failureBlock":
      return <FailureBlock testId={line.testId} />;
    case "summary":
      return <Summary passed={line.passed} failed={line.failed} ms={line.ms} />;
    case "coverage":
      return <Coverage />;
    case "contact":
      return <Contact />;
    case "resume":
      return <ResumeText />;
    case "listing":
      return <Listing paths={line.paths} />;
    case "source":
      return <Source />;
    case "ci":
      return <CiReport />;
    case "help":
      return <Help />;
    case "rule":
      return <hr className="my-3 border-line" />;
    case "text":
      return <TextLine text={line.text} tone={line.tone} />;
    default:
      return null;
  }
}

export { fmt };
