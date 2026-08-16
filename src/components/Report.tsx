"use client";

import {
  allSpecs,
  allTests,
  contact,
  credentials,
  profile,
  RESUME_PDF,
  skillGroups,
  suites,
  totals,
  type Spec,
  type Test,
} from "@/lib/resume";
import { useRunner } from "@/lib/runner-context";
import { fmt } from "./Lines";
import { Phone } from "./Phone";

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

function SpecRow({ spec }: { spec: Spec }) {
  const { state, dispatch } = useRunner();
  const active = state.activeSpecId === spec.id;
  const failed = spec.tests.filter((t) => t.status === "failed").length;
  const ran = spec.tests.filter((t) => state.status[t.id] !== "pending").length;

  return (
    <button
      onClick={() => dispatch({ type: "OPEN_SPEC", specId: spec.id })}
      aria-label={`${spec.title} — ${spec.tests.length} assertions${failed ? `, ${failed} failing` : ""}`}
      aria-current={active ? "true" : undefined}
      className={`group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
        active
          ? "bg-panel-hi text-fg-strong"
          : "text-fg-dim hover:bg-panel/70 hover:text-fg"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          ran === 0 ? "bg-fg-faint" : failed ? "bg-fail" : "bg-pass"
        }`}
        style={
          ran > 0 && failed
            ? { boxShadow: "0 0 8px var(--glow-fail)" }
            : ran > 0
              ? { boxShadow: "0 0 8px var(--glow-pass)" }
              : undefined
        }
      />
      <span className="min-w-0 flex-1 truncate">{spec.title}</span>
      <span className="shrink-0 text-[11px] tabular-nums text-fg-faint">
        {spec.tests.length}
      </span>
    </button>
  );
}

function Sidebar() {
  const { state, dispatch } = useRunner();
  return (
    <nav
      aria-label="Spec files"
      className="hidden w-64 shrink-0 overflow-y-auto border-r border-line px-3 py-4 md:block lg:w-72"
    >
      <button
        onClick={() => dispatch({ type: "CLOSE_SPEC" })}
        className={`mb-3 w-full rounded-md px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-panel/70 hover:text-fg ${
          state.activeSpecId ? "text-fg-dim" : "bg-panel-hi text-fg-strong"
        }`}
      >
        Overview
      </button>
      {suites.map((suite) => (
        <div key={suite.id} className="mb-4">
          <p className="px-2.5 pb-1.5 text-[11px] tracking-[0.12em] text-fg-faint uppercase">
            {suite.title}
          </p>
          <div className="space-y-0.5">
            {suite.specs.map((spec) => (
              <SpecRow key={spec.id} spec={spec} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Trace viewer                                                        */
/* ------------------------------------------------------------------ */

function TestRow({ test, specId }: { test: Test; specId: string }) {
  const { state, dispatch } = useRunner();
  const open = state.activeTestId === test.id;
  const failed = test.status === "failed";
  const ran = state.status[test.id] !== "pending";

  return (
    <div
      className={`overflow-hidden rounded-md border transition-colors ${
        open ? "border-line bg-panel/60" : "border-transparent hover:bg-panel/40"
      }`}
    >
      <button
        onClick={() => dispatch({ type: "OPEN_TEST", testId: open ? null : test.id })}
        aria-expanded={open}
        aria-label={`${!ran ? "Not run" : failed ? "Failed" : "Passed"}: ${test.title}. ${fmt(test.duration)}.`}
        className="flex w-full items-baseline gap-3 px-3 py-2 text-left"
      >
        <span
          className={`w-3.5 shrink-0 text-center text-[13px] ${
            !ran ? "text-fg-faint" : failed ? "text-fail" : "text-pass"
          }`}
        >
          {!ran ? "○" : failed ? "✘" : "✓"}
        </span>
        <span
          className={`flex-1 text-[13.5px] leading-relaxed ${
            failed ? "text-fail" : "text-fg"
          }`}
        >
          {test.title}
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-fg-faint">
          {fmt(test.duration)}
        </span>
      </button>

      {open && (
        <div className="animate-fade-in space-y-3 border-t border-line px-3 py-3 pl-[2.1rem]">
          {test.note && (
            <p className="max-w-2xl text-[13px] leading-relaxed text-fg-dim">
              {test.note}
            </p>
          )}
          {test.tags && test.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {test.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-line bg-bg px-1.5 py-0.5 text-[11px] text-fg-dim"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {test.failure && (
            <div className="space-y-2 rounded border border-fail/30 bg-fail/[0.05] p-3">
              <p className="text-[13px] text-fail">Error: {test.failure.matcher}</p>
              <p className="text-[13px]">
                <span className="text-fg-dim">Expected: </span>
                <span className="text-pass">{test.failure.expected}</span>
                <span className="text-fg-dim"> · Received: </span>
                <span className="text-fail">{test.failure.received}</span>
              </p>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-1">
                {test.failure.trace.map((t) => (
                  <a
                    key={t.href}
                    href={t.href}
                    target={t.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="text-[13px] text-accent underline decoration-accent/30 underline-offset-4 hover:text-fg-strong"
                  >
                    {t.label}
                  </a>
                ))}
                <Phone className="text-[13px]" />
              </div>
            </div>
          )}
          <p className="text-[11px] text-fg-faint">
            at {specId}.spec.ts › {test.id}
          </p>
        </div>
      )}
    </div>
  );
}

function SpecDetail({ spec }: { spec: Spec }) {
  const { dispatch } = useRunner();
  const failed = spec.tests.filter((t) => t.status === "failed").length;
  const passed = spec.tests.length - failed;
  const ms = Math.round(spec.tests.reduce((a, t) => a + t.duration, 0) / 4);

  return (
    <div
      data-testid="spec-detail"
      data-spec={spec.id}
      className="animate-rise-in mx-auto max-w-3xl px-5 py-6 sm:px-8 sm:py-10"
    >
      <button
        onClick={() => dispatch({ type: "CLOSE_SPEC" })}
        className="mb-4 text-[13px] text-fg-dim transition-colors hover:text-accent md:hidden"
      >
        ← All specs
      </button>

      <p className="text-[12px] text-fg-faint">{spec.file}</p>
      <h2 className="mt-1.5 font-sans text-2xl font-semibold tracking-tight text-fg-strong sm:text-3xl">
        {spec.role}
      </h2>
      <p className="mt-1.5 text-[13.5px] text-fg-dim">
        {spec.org} · {spec.location} · {spec.period}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
        <span className="text-pass">{passed} passed</span>
        {failed > 0 && <span className="text-fail">{failed} failed</span>}
        <span className="tabular-nums text-fg-faint">{fmt(ms)}</span>
      </div>

      <p className="mt-6 max-w-2xl font-sans text-[15px] leading-relaxed text-fg">
        {spec.brief}
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {spec.stack.map((s) => (
          <span
            key={s}
            className="rounded border border-line bg-panel px-2 py-0.5 text-[11.5px] text-fg-dim"
          >
            {s}
          </span>
        ))}
      </div>

      <h3 className="mt-9 mb-2 text-[11px] tracking-[0.12em] text-fg-faint uppercase">
        Assertions
      </h3>
      <div className="space-y-0.5">
        {spec.tests.map((t) => (
          <TestRow key={t.id} test={t} specId={spec.id} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function Meter({ value }: { value: number }) {
  const color = value >= 95 ? "bg-pass" : value >= 88 ? "bg-warn" : "bg-fail";
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-line">
      <div
        className={`h-full rounded-full ${color} transition-[width] duration-700 ease-out`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function SpecGrid({
  heading,
  specs,
  subtitle,
}: {
  heading: string;
  specs: Spec[];
  subtitle?: string;
}) {
  const { dispatch } = useRunner();
  if (!specs.length) return null;

  return (
    <>
      <h3 className="mt-10 mb-1 text-[11px] tracking-[0.12em] text-fg-faint uppercase">
        {heading}
      </h3>
      {subtitle && (
        <p className="mb-3 font-sans text-[13px] text-fg-dim">{subtitle}</p>
      )}
      <div className={`grid gap-2 sm:grid-cols-2 ${subtitle ? "" : "mt-3"}`}>
        {specs.map((spec) => {
          const failed = spec.tests.some((t) => t.status === "failed");
          return (
            <button
              key={spec.id}
              onClick={() => dispatch({ type: "OPEN_SPEC", specId: spec.id })}
              className="group min-w-0 rounded-lg border border-line bg-panel/40 px-3.5 py-3 text-left transition-colors hover:border-accent/40 hover:bg-panel"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${failed ? "bg-fail" : "bg-pass"}`}
                />
                <span className="truncate text-[13px] text-fg-strong">
                  {spec.title}
                </span>
              </div>
              <p className="mt-1 truncate text-[12px] text-fg-dim">
                {spec.kind === "project" ? spec.stack.slice(0, 3).join(" · ") : `${spec.org} · ${spec.period}`}
              </p>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Overview() {
  const { state, dispatch } = useRunner();
  // Live, not static: the counts climb while the suite runs behind this view.
  const ran = allTests.filter((t) => state.status[t.id] !== "pending");
  const passed = ran.filter((t) => t.status === "passed").length;
  const failed = ran.filter((t) => t.status === "failed").length;
  return (
    <div
      data-testid="overview"
      className="animate-rise-in mx-auto max-w-3xl px-5 py-6 sm:px-8 sm:py-10"
    >
      <p className="text-[12px] text-fg-faint">report/index.html</p>
      <h2 className="mt-1.5 font-sans text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl">
        {profile.name}
      </h2>
      <p className="mt-1.5 font-sans text-[15px] text-fg-dim">{profile.title}</p>

      {/* The two things a visitor most likely wants, before anything else. */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <a
          href={RESUME_PDF}
          download
          data-testid="resume-download"
          className="rounded border border-accent/40 bg-accent/10 px-3 py-1.5 font-sans text-[13px] text-accent transition-colors hover:bg-accent/20"
        >
          Download résumé (PDF)
        </a>
        <a
          href={`mailto:${contact.email}`}
          className="rounded border border-line px-3 py-1.5 font-sans text-[13px] text-fg-dim transition-colors hover:border-accent/40 hover:text-accent"
        >
          Email
        </a>
        <a
          href={contact.linkedinUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded border border-line px-3 py-1.5 font-sans text-[13px] text-fg-dim transition-colors hover:border-accent/40 hover:text-accent"
        >
          LinkedIn
        </a>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "terminal" })}
          data-testid="open-terminal-cta"
          className="rounded border border-line px-3 py-1.5 font-sans text-[13px] text-fg-dim transition-colors hover:border-accent/40 hover:text-accent"
        >
          Open the terminal →
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "passed", value: passed, tone: "text-pass" },
          { label: "failed", value: failed, tone: "text-fail" },
          { label: "specs", value: totals.specs, tone: "text-fg-strong" },
          { label: "years", value: profile.yearsExperience, tone: "text-fg-strong" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-line bg-panel/60 px-3 py-3"
          >
            <p className={`font-sans text-2xl font-semibold tabular-nums ${s.tone}`}>
              {s.value}
            </p>
            <p className="mt-0.5 text-[11px] tracking-wide text-fg-faint uppercase">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-7 max-w-2xl font-sans text-[15px] leading-relaxed text-fg">
        {profile.summary}
      </p>

      <h3 className="mt-10 mb-3 text-[11px] tracking-[0.12em] text-fg-faint uppercase">
        Coverage
      </h3>
      <div className="space-y-3">
        {skillGroups.map((g) => (
          <div key={g.id}>
            <div className="mb-1 flex items-baseline justify-between gap-4">
              <span className="text-[13px] text-fg">{g.label}</span>
              <span className="shrink-0 text-[12px] tabular-nums text-fg-faint">
                {g.coverage.stmts.toFixed(1)}%
              </span>
            </div>
            <Meter value={g.coverage.stmts} />
            <p className="mt-1.5 text-[12px] leading-relaxed text-fg-dim">
              {g.items.join(" · ")}
            </p>
          </div>
        ))}
      </div>

      <SpecGrid
        heading="Experience"
        specs={suites.find((s) => s.id === "career")?.specs ?? []}
      />
      <SpecGrid
        heading="Projects"
        specs={suites.find((s) => s.id === "tools")?.specs ?? []}
        subtitle="Tooling built so the quality work above could happen."
      />

      <h3 className="mt-10 mb-3 text-[11px] tracking-[0.12em] text-fg-faint uppercase">
        Education
      </h3>
      <div className="space-y-2">
        {credentials.map((c) => (
          <div key={c.degree} className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[13.5px] text-fg">{c.degree}</span>
            <span className="text-[12.5px] text-fg-dim">
              {c.institution}, {c.location}
            </span>
            <span className="text-[12px] tabular-nums text-fg-faint">{c.year}</span>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-lg border border-fail/30 bg-fail/[0.04] px-4 py-5">
        <p className="text-[13px] text-fail">1 test is still failing.</p>
        <p className="mt-1.5 max-w-xl font-sans text-[15px] leading-relaxed text-fg">
          <button
            onClick={() => dispatch({ type: "OPEN_SPEC", specId: "availability" })}
            className="font-mono text-fg-strong underline decoration-fail/40 underline-offset-4 transition-colors hover:text-fail"
          >
            availability.spec.ts
          </button>{" "}
          expects this candidate to be off the market. It is currently receiving{" "}
          <span className="text-fail">&quot;available immediately&quot;</span>.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          <a
            href={`mailto:${contact.email}`}
            className="rounded border border-accent/40 bg-accent/10 px-3 py-1.5 text-[13px] text-accent transition-colors hover:bg-accent/20"
          >
            {contact.email}
          </a>
          <a
            href={contact.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-line px-3 py-1.5 text-[13px] text-fg-dim transition-colors hover:border-accent/40 hover:text-accent"
          >
            {contact.linkedin}
          </a>
          <Phone className="rounded border border-line px-3 py-1.5 text-[13px]" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Report() {
  const { state } = useRunner();
  const spec = allSpecs.find((s) => s.id === state.activeSpecId);

  return (
    <div className="flex h-full min-h-0">
      <Sidebar />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {spec ? <SpecDetail spec={spec} /> : <Overview />}
      </div>
    </div>
  );
}
