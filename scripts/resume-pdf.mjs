#!/usr/bin/env node
/**
 * Renders the site's own print view to `public/manny-castillo-resume.pdf`.
 *
 * Two reasons this is generated rather than a file dropped in by hand:
 *
 *   1. It stays in sync. The PDF is produced from the same `src/lib/resume.ts`
 *      the site renders, so a résumé edit can't leave a stale download behind.
 *   2. It carries no phone number. The hand-maintained PDF does — verified by
 *      decompressing its text streams — and crawlers extract text from PDFs
 *      routinely, which would undo the work in src/lib/phone.ts.
 *
 * Boots its own production server so it can run anywhere, CI included.
 */

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const PORT = process.env.RESUME_PDF_PORT ?? "4599";
const URL = `http://localhost:${PORT}`;
const OUT = "public/manny-castillo-resume.pdf";

async function waitForServer(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(URL);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const server = spawn("npm", ["run", "start"], {
  env: { ...process.env, PORT },
  stdio: "ignore",
});

let exitCode = 0;
try {
  if (!(await waitForServer())) {
    throw new Error(`server did not come up on ${URL} — run \`npm run build\` first`);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Not `networkidle`: the CI badge polls GitHub, so the network never goes
  // quiet. The résumé is server-rendered, so the DOM is all this needs.
  await page.goto(URL, { waitUntil: "domcontentloaded" });

  // The runner chrome is display:none under print; ResumeDocument is shown.
  await page.emulateMedia({ media: "print" });
  await page.waitForSelector("article", { state: "attached" });
  await page.waitForFunction(() => document.fonts.ready.then(() => true));

  mkdirSync("public", { recursive: true });
  await page.pdf({
    path: OUT,
    format: "Letter",
    printBackground: false,
    margin: { top: "0.6in", bottom: "0.6in", left: "0.7in", right: "0.7in" },
  });

  await browser.close();
  console.log(`resume-pdf: wrote ${OUT}`);
} catch (err) {
  console.error(`resume-pdf: ${err.message}`);
  exitCode = 1;
} finally {
  server.kill();
}

process.exit(exitCode);
