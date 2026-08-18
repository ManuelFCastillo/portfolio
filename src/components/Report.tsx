"use client";

import {
  allSpecs,
  allTests,
  contact,
  credentials,
  type Screenshot,
  profile,
  RESUME_PDF,
  skillGroups,
  suites,
  totals,
  type Spec,
  type Test,
} from "@/lib/resume";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRunner } from "@/lib/runner-context";
import { fmt } from "./Lines";
import { Email } from "./Email";
import { Phone } from "./Phone";
import { ProjectCiBadge } from "./CiStatus";

/**
 * Screenshots for projects nobody can go and run. Rendered small inline, with
 * a click to enlarge — the UI text in a product shot is illegible at column
 * width, which makes an un-enlargeable screenshot decorative rather than
 * evidence.
 *
 * The overlay is portalled to <body> rather than rendered in place. `position:
 * fixed` is only viewport-relative while no ancestor establishes a containing
 * block, and the report body sits inside `.animate-rise-in`, whose animation
 * leaves a (identity) `transform` behind — enough to re-anchor `inset-0` to
 * that scrolling column. The overlay then measured 533px wide, 595px above the
 * viewport, and the "enlarged" image came out 2px across: clicking to zoom
 * appeared to do nothing. A portal is the durable fix, because it also survives
 * any future transform, filter, or backdrop-blur added to an ancestor.
 */
/**
 * Both the thumbnail and the overlay declare the same `sizes`, so next/image
 * resolves them to the same srcset candidate and the overlay paints from cache
 * the instant it opens. They used to differ, which meant the overlay asked for
 * a variant nobody had fetched (an upscaled w=3840 of a 1600px source) and
 * opened on an image with no bytes.
 */
const SHOT_SIZES = "(max-width: 900px) 100vw, 720px";

function Shots({ shots }: { shots: Screenshot[] }) {
  const [zoomed, setZoomed] = useState<Screenshot | null>(null);

  // Escape closes from anywhere, and the page behind must not scroll while the
  // overlay owns the screen.
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoomed(null);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [zoomed]);

  return (
    <>
      <div className="mt-6 space-y-3" data-testid="screenshots">
        {shots.map((shot) => (
          <figure key={shot.src}>
            <button
              onClick={() => setZoomed(shot)}
              data-testid="screenshot-open"
              aria-label={`Enlarge screenshot: ${shot.alt}`}
              className="group block w-full overflow-hidden rounded-lg border border-line transition-colors hover:border-accent/40"
            >
              <Image
                src={shot.src}
                width={shot.width}
                height={shot.height}
                alt={shot.alt}
                sizes={SHOT_SIZES}
                className="h-auto w-full"
              />
            </button>
            <figcaption className="mt-2 font-sans text-[12.5px] leading-relaxed text-fg-dim">
              {shot.caption}{" "}
              <span className="text-fg-faint">Click to enlarge.</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {zoomed &&
        createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={zoomed.alt}
          data-testid="screenshot-lightbox"
          onClick={() => setZoomed(null)}
          tabIndex={-1}
          ref={(el) => el?.focus()}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-bg/90 p-4 backdrop-blur-sm sm:p-8"
        >
          {/*
            Sized from the overlay rather than from the image's intrinsic size:
            with width and height both auto, an image that has not decoded yet
            lays out at 2x2, so "enlarge" visibly did nothing until the bytes
            arrived. object-contain letterboxes the picture inside the box.
          */}
          <Image
            src={zoomed.src}
            width={zoomed.width}
            height={zoomed.height}
            alt={zoomed.alt}
            sizes={SHOT_SIZES}
            className="h-full w-full rounded-lg border border-line object-contain"
          />
          <button
            onClick={() => setZoomed(null)}
            aria-label="Close screenshot"
            className="absolute top-4 right-4 rounded border border-line bg-panel/90 px-3 py-1.5 text-[13px] text-fg-dim hover:text-accent"
          >
            Close
          </button>
        </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Internal work is flagged because a reader cannot click through to it.
 * Contract work is flagged because paid client delivery is a different — and
 * stronger — claim than a side project. Personal work needs no badge.
 */
function OriginBadge({
  origin,
  className = "",
}: {
  origin?: Spec["origin"];
  className?: string;
}) {
  if (origin !== "internal" && origin !== "contract") return null;

  const style =
    origin === "contract"
      ? "border-pass/30 bg-pass/10 text-pass"
      : "border-violet/30 bg-violet/10 text-violet";
  const title =
    origin === "contract"
      ? "Paid contract work, delivered for a client"
      : "Built for internal use at Sorcero — not publicly accessible";

  return (
    <span
      data-testid={`${origin}-badge`}
      title={title}
      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] tracking-wide uppercase ${style} ${className}`}
    >
      {origin}
    </span>
  );
}

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
      {(spec.origin === "internal" || spec.origin === "contract") && (
        <span
          aria-hidden
          title={spec.origin === "contract" ? "Contract" : "Internal"}
          className={`shrink-0 text-[9px] tracking-wider uppercase ${
            spec.origin === "contract" ? "text-pass/70" : "text-violet/70"
          }`}
        >
          {spec.origin === "contract" ? "con" : "int"}
        </span>
      )}
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
                <Email className="text-[13px] text-accent underline decoration-accent/30 underline-offset-4 hover:text-fg-strong" />
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

export function SpecDetail({ spec }: { spec: Spec }) {
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

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[12px] text-fg-faint">{spec.file}</p>
        <OriginBadge origin={spec.origin} />
      </div>
      <h2 className="mt-1.5 font-sans text-2xl font-semibold tracking-tight text-fg-strong sm:text-3xl">
        {spec.role}
      </h2>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-fg-dim">
        <span>
          {spec.org} · {spec.location} · {spec.period}
        </span>
        {spec.ci && <ProjectCiBadge project={spec.ci} />}
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

      {spec.screenshots && <Shots shots={spec.screenshots} />}

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
      <div
        data-testid="spec-grid"
        data-heading={heading.toLowerCase()}
        className={`grid gap-2 sm:grid-cols-2 ${subtitle ? "" : "mt-3"}`}
      >
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
                <OriginBadge origin={spec.origin} />
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
        <Email
          label="Email"
          className="rounded border border-line px-3 py-1.5 font-sans text-[13px] text-fg-dim transition-colors hover:border-accent/40 hover:text-accent"
        />
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
        specs={suites.find((s) => s.id === "projects")?.specs ?? []}
        subtitle="Client and personal work first; internal tooling built at Sorcero is marked."
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
          <Email className="rounded border border-accent/40 bg-accent/10 px-3 py-1.5 text-[13px] text-accent transition-colors hover:bg-accent/20" />
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
