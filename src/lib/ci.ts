/**
 * Live CI status: the badge is the real conclusion of the real Playwright run
 * against this real site.
 *
 * Read from two sources, in order:
 *
 *   1. `/ci-status.json` — written by the pipeline (see scripts/ci-status.mjs)
 *      into the build that gets deployed. Same-origin, no CORS, no rate limit,
 *      and it carries real test counts. This is the path visitors hit.
 *   2. The public GitHub Actions API — a fallback for local development and
 *      for any deploy where step 1 hasn't run.
 *
 * The API is deliberately *not* primary: it is anonymous and rate-limited to
 * 60 requests/hour **per IP**, so a single corporate NAT — precisely where a
 * hiring manager sits — can exhaust it for everyone behind it and leave the
 * badge dead. Both paths degrade to a plain link rather than breaking.
 */

export const REPO_OWNER = "ManuelFCastillo";
export const REPO_NAME = "portfolio";
export const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;
export const WORKFLOW_URL = `${REPO_URL}/actions`;

const API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?per_page=1&status=completed`;

export type CiConclusion = "success" | "failure" | "cancelled" | "unknown";

export interface CiRun {
  conclusion: CiConclusion;
  runNumber: number | null;
  sha: string;
  shaShort: string;
  url: string;
  branch: string;
  finishedAt: string | null;
  durationMs: number | null;
  /** Only available from the pipeline-published file, not from the API. */
  passed: number | null;
  failed: number | null;
  source: "build" | "api";
}

/** Shape of the file written by scripts/ci-status.mjs. */
interface PublishedStatus {
  conclusion: string;
  passed: number;
  failed: number;
  durationMs: number;
  sha: string;
  branch: string;
  runNumber: number | null;
  url: string;
  finishedAt: string;
}

function asConclusion(value: string | null | undefined): CiConclusion {
  return value === "success" || value === "failure" || value === "cancelled"
    ? value
    : "unknown";
}

function fromPublished(s: PublishedStatus): CiRun {
  return {
    conclusion: asConclusion(s.conclusion),
    runNumber: s.runNumber ?? null,
    sha: s.sha ?? "",
    shaShort: (s.sha ?? "").slice(0, 7),
    url: s.url,
    branch: s.branch ?? "main",
    finishedAt: s.finishedAt ?? null,
    durationMs: s.durationMs ?? null,
    passed: s.passed ?? null,
    failed: s.failed ?? null,
    source: "build",
  };
}

interface GithubRun {
  conclusion: string | null;
  run_number: number;
  head_sha: string;
  html_url: string;
  head_branch: string | null;
  run_started_at?: string;
  created_at: string;
  updated_at: string;
}

function normalise(run: GithubRun): CiRun {
  const started = Date.parse(run.run_started_at ?? run.created_at);
  const ended = Date.parse(run.updated_at);
  const durationMs =
    Number.isFinite(started) && Number.isFinite(ended) && ended > started
      ? ended - started
      : null;

  return {
    conclusion: asConclusion(run.conclusion),
    runNumber: run.run_number ?? null,
    sha: run.head_sha ?? "",
    shaShort: (run.head_sha ?? "").slice(0, 7),
    url: run.html_url,
    branch: run.head_branch ?? "main",
    finishedAt: run.updated_at ?? null,
    durationMs,
    passed: null,
    failed: null,
    source: "api",
  };
}

/** Shared across the status bar and the `ci` command — fetched at most once. */
let inflight: Promise<CiRun | null> | null = null;

/** Published by the pipeline into the deployed build. No CORS, no limits. */
async function fromBuild(): Promise<CiRun | null> {
  try {
    const res = await fetch("/ci-status.json", { cache: "no-cache" });
    if (!res.ok) return null;
    const body = (await res.json()) as PublishedStatus;
    if (!body?.conclusion || body.conclusion === "unknown") return null;
    return fromPublished(body);
  } catch {
    return null;
  }
}

/** Fallback only: anonymous, CORS-enabled, 60 req/hour per IP. */
async function fromApi(): Promise<CiRun | null> {
  try {
    const res = await fetch(API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { workflow_runs?: GithubRun[] };
    const run = body.workflow_runs?.[0];
    return run ? normalise(run) : null;
  } catch {
    // Offline, rate-limited, blocked, or the repo has no runs yet.
    return null;
  }
}

export function loadCiRun(): Promise<CiRun | null> {
  if (!inflight) {
    inflight = (async () => (await fromBuild()) ?? (await fromApi()))();
  }
  return inflight;
}

/** Test seam — lets the suite reset the module cache between cases. */
export function resetCiCache() {
  inflight = null;
  projectInflight.clear();
}

// --------------------------------------------------------------- project CI
//
// Some of the projects on this site run their own suites in their own repos.
// Those repos are private, so the anonymous Actions API returns 404 for them
// and the browser can never read their status directly. Instead the build
// fetches each one server-side with a token (scripts/project-ci-status.mjs)
// and writes `public/ci-status-<slug>.json`, which is public, tiny, and carries
// nothing but a conclusion, a run number and a timestamp.
//
// No token configured means no file, which means no badge — the project still
// renders, just without a live status.

export interface ProjectCi {
  /** `owner/name`. Private is fine; nothing about it reaches the browser. */
  repo: string;
  /** Names the published file: `public/ci-status-<slug>.json`. */
  slug: string;
  /** What the suite covers, for the badge's tooltip. */
  label: string;
}

const projectInflight = new Map<string, Promise<CiRun | null>>();

export function loadProjectCiRun(project: ProjectCi): Promise<CiRun | null> {
  const cached = projectInflight.get(project.slug);
  if (cached) return cached;

  const pending = (async () => {
    try {
      const res = await fetch(`/ci-status-${project.slug}.json`, {
        cache: "no-cache",
      });
      if (!res.ok) return null;
      const body = (await res.json()) as PublishedStatus;
      if (!body?.conclusion || body.conclusion === "unknown") return null;
      return fromPublished(body);
    } catch {
      return null;
    }
  })();

  projectInflight.set(project.slug, pending);
  return pending;
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
