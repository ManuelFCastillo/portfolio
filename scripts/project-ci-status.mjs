#!/usr/bin/env node
/**
 * Publishes the CI status of the *other* repos this site talks about.
 *
 * Those repos are private, so the browser can never read their status: the
 * anonymous GitHub API returns 404, and handing a token to the client would
 * publish the token. This runs at build time instead — one server-side call per
 * repo per deploy — and writes `public/ci-status-<slug>.json`, which contains a
 * conclusion, a run number, a branch, a short SHA and a timestamp. Nothing about
 * the repo's contents, and no credential, reaches the browser.
 *
 * Auth: PROJECT_CI_TOKEN, a fine-grained PAT with Actions: read on the listed
 * repos and nothing else. Without it this writes nothing and exits 0 — the
 * badge simply does not render, and no deploy ever fails over a missing status.
 *
 * Run from `prebuild`, so Vercel picks it up on every deploy.
 */

import { mkdirSync, writeFileSync } from "node:fs";

/** Keep in sync with the `ci` field on the specs in src/lib/resume.ts. */
const PROJECTS = [
  { repo: "ManuelFCastillo/ask-the-library", slug: "ask-the-library", workflow: "ci.yml" },
];

const TOKEN = process.env.PROJECT_CI_TOKEN ?? process.env.GH_PROJECT_CI_TOKEN;

if (!TOKEN) {
  console.log(
    "project-ci-status: PROJECT_CI_TOKEN not set; skipping (badges will not render).",
  );
  process.exit(0);
}

async function latestRun({ repo, workflow }) {
  const base = `https://api.github.com/repos/${repo}/actions`;
  const url = workflow
    ? `${base}/workflows/${workflow}/runs?per_page=1&status=completed`
    : `${base}/runs?per_page=1&status=completed`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${repo}`);

  const run = (await res.json()).workflow_runs?.[0];
  if (!run) throw new Error(`no completed runs for ${repo}`);

  const started = Date.parse(run.run_started_at ?? run.created_at);
  const ended = Date.parse(run.updated_at);

  return {
    conclusion: run.conclusion ?? "unknown",
    // The Actions API does not expose test counts; the badge omits them rather
    // than inventing them.
    passed: null,
    failed: null,
    durationMs: ended > started ? ended - started : 0,
    sha: run.head_sha ?? "",
    branch: run.head_branch ?? "main",
    runNumber: run.run_number ?? null,
    url: run.html_url,
    finishedAt: run.updated_at ?? new Date().toISOString(),
  };
}

mkdirSync("public", { recursive: true });

let failures = 0;
for (const project of PROJECTS) {
  try {
    const status = await latestRun(project);
    const out = `public/ci-status-${project.slug}.json`;
    writeFileSync(out, JSON.stringify(status, null, 2) + "\n");
    console.log(
      `project-ci-status: ${project.slug} ${status.conclusion} (run #${status.runNumber}) → ${out}`,
    );
  } catch (err) {
    // A project whose status cannot be read is a missing badge, not a failed
    // deploy.
    failures += 1;
    console.warn(`project-ci-status: ${project.slug} skipped — ${err.message}`);
  }
}

if (failures === PROJECTS.length) {
  console.warn("project-ci-status: no statuses published.");
}
