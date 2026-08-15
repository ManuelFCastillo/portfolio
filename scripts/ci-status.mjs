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

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const REPORT = process.env.PW_JSON_REPORT ?? "test-results/results.json";
const OUT = "public/ci-status.json";

let stats = {};
try {
  stats = JSON.parse(readFileSync(REPORT, "utf8")).stats ?? {};
} catch {
  console.error(`ci-status: could not read ${REPORT}; writing an unknown status.`);
}

const passed = stats.expected ?? 0;
const failed = stats.unexpected ?? 0;
const env = process.env;

const runNumber = env.GITHUB_RUN_NUMBER ? Number(env.GITHUB_RUN_NUMBER) : null;
const repo = env.GITHUB_REPOSITORY ?? "ManuelFCastillo/portfolio";

const status = {
  conclusion: Object.keys(stats).length === 0 ? "unknown" : failed === 0 ? "success" : "failure",
  passed,
  failed,
  flaky: stats.flaky ?? 0,
  skipped: stats.skipped ?? 0,
  durationMs: Math.round(stats.duration ?? 0),
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
