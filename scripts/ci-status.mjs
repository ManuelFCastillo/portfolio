#!/usr/bin/env node
/**
 * Turns the Playwright JSON report into `public/ci-status.json`.
 *
 * The site reads that file same-origin, so the badge costs zero API calls and
 * cannot be rate-limited. It also carries real test counts, which the GitHub
 * Actions API does not expose.
 *
 * Run after the suite, before the build that gets deployed.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const REPORT = process.env.PW_JSON_REPORT ?? "test-results/results.json";
const OUT = "public/ci-status.json";
const REPO = process.env.GITHUB_REPOSITORY ?? "ManuelFCastillo/portfolio";

/**
 * Build-time fallback for hosts that build from git and have no Playwright
 * report — Vercel, for instance. One server-side call per deploy, so visitors
 * still never touch GitHub's anonymous 60/hour/IP limit.
 */
async function fromGithub() {
  const url = `https://api.github.com/repos/${REPO}/actions/runs?per_page=1&status=completed`;
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const run = (await res.json()).workflow_runs?.[0];
  if (!run) throw new Error("no completed runs");

  const started = Date.parse(run.run_started_at ?? run.created_at);
  const ended = Date.parse(run.updated_at);
  return {
    conclusion: run.conclusion ?? "unknown",
    passed: 0,
    failed: 0,
    flaky: 0,
    skipped: 0,
    durationMs: ended > started ? ended - started : 0,
    sha: run.head_sha ?? "",
    branch: run.head_branch ?? "main",
    runNumber: run.run_number ?? null,
    url: run.html_url,
    finishedAt: run.updated_at ?? new Date().toISOString(),
  };
}

// A status already written by this pipeline's own run wins — it has real
// counts, which the API cannot give.
if (existsSync(OUT) && !process.env.PW_JSON_REPORT && !existsSync(REPORT)) {
  console.log(`ci-status: ${OUT} already present; leaving it alone.`);
  process.exit(0);
}

let stats = null;
try {
  stats = JSON.parse(readFileSync(REPORT, "utf8")).stats ?? {};
} catch {
  // No local report — try the API before giving up.
  try {
    const status = await fromGithub();
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify(status, null, 2) + "\n");
    console.log(
      `ci-status: ${status.conclusion} from the GitHub API (run #${status.runNumber}) → ${OUT}`,
    );
    process.exit(0);
  } catch (err) {
    console.error(`ci-status: no report and no API (${err.message}); writing unknown.`);
    stats = {};
  }
}

const passed = stats?.expected ?? 0;
const failed = stats?.unexpected ?? 0;
const env = process.env;

const runNumber = env.GITHUB_RUN_NUMBER ? Number(env.GITHUB_RUN_NUMBER) : null;
const repo = env.GITHUB_REPOSITORY ?? "ManuelFCastillo/portfolio";

const status = {
  conclusion:
    !stats || Object.keys(stats).length === 0
      ? "unknown"
      : failed === 0
        ? "success"
        : "failure",
  passed,
  failed,
  flaky: stats?.flaky ?? 0,
  skipped: stats?.skipped ?? 0,
  durationMs: Math.round(stats?.duration ?? 0),
  sha: env.GITHUB_SHA ?? "",
  branch: env.GITHUB_REF_NAME ?? "local",
  runNumber,
  url: env.GITHUB_RUN_ID
    ? `https://github.com/${repo}/actions/runs/${env.GITHUB_RUN_ID}`
    : `https://github.com/${repo}/actions`,
  finishedAt: new Date().toISOString(),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(status, null, 2) + "\n");

console.log(
  `ci-status: ${status.conclusion} — ${passed} passed, ${failed} failed → ${OUT}`,
);
