# portfolio

**Live: https://portfolio-nine-woad-35.vercel.app**

[![e2e](https://github.com/ManuelFCastillo/portfolio/actions/workflows/e2e.yml/badge.svg)](https://github.com/ManuelFCastillo/portfolio/actions/workflows/e2e.yml)

A portfolio for a Senior SDET, built as the thing it's describing: **a test runner
whose specs are the résumé.**

Visitors land on a live suite execution. Every claim is an assertion that passes in
front of them. One test fails — `availability.spec.ts › candidate is off the market` —
and its stack trace is the contact information.

## The idea

Most portfolios *describe* the work. This one performs it. The audience for this site
is engineers who read Playwright reporter output fluently, so the reporter *is* the
interface — no learning curve, instant recognition, and the medium doubles as the proof.

Two surfaces, one state machine:

- **Desktop** — a small window manager behind the Terminal tab: draggable windows
  with working traffic lights, a Files browser, and the résumé PDF previewed in
  place. Collapses to a plain full-bleed terminal below 900px.
- **Terminal** — a real command parser with history, tab completion, and `--grep`
  filtering. Not canned strings.
- **Report** — a Playwright-style HTML report: spec tree, expandable assertions,
  trace-viewer panels that open into case studies, skills rendered as a coverage table.

Window geometry is deliberately *not* in the runner reducer — moving a window is
not a fact about the résumé. But clicking a spec in Files still dispatches into the
runner, so the desktop is a third surface over the same state rather than a
separate app.

They share one reducer. Click a spec in the report and the equivalent command appears
in the terminal history; run `open career/sorcero.spec.ts` and the report moves. There
is exactly one source of truth about what ran, what passed, and what's open.

## Contact details

Email and LinkedIn are in the clear — they're the routes worth using, and both survive
spam filtering better than a phone number survives a robocall list.

The phone number is not. It's held obfuscated in [`src/lib/phone.ts`](src/lib/phone.ts)
and revealed only on a click, so it appears in none of: this repository, the
server-rendered HTML, or the DOM at rest. That's obfuscation, not security — a human
reading that file recovers it in seconds. The threat model is bulk harvesters, which
match phone-shaped patterns, don't execute JavaScript, and don't click buttons.

## Editing the résumé

Everything lives in [`src/lib/resume.ts`](src/lib/resume.ts). It is the single source
of truth — the terminal, the report, the print stylesheet, the JSON-LD structured data,
and the server-rendered semantic résumé all read from it. Add a bullet by adding a
`Test`; add a role by adding a `Spec`. Totals recompute themselves.

Test titles are written as **assertions** — present tense, no "responsible for."

Specs are grouped into suites, and section placement is driven by the suite a spec
belongs to rather than by an id blacklist, so a new suite can't silently land in the
wrong part of the résumé:

- **`career/`** — employment. Renders as Experience.
- **`tools/`** — things built rather than jobs held (`kind: "project"`). Renders as
  Projects, keyed on stack rather than dates.
- **`education/`**, **`availability/`** — their own sections; `availability` holds the
  one deliberately failing assertion.

## Architecture

```
src/lib/resume.ts         the résumé, modeled as suites → specs → tests
src/lib/runner.ts         reducer, command parser, run scheduling
src/lib/runner-context.tsx  provider + the clock that emits queued lines
src/components/Terminal.tsx the CLI surface
src/components/Report.tsx   the GUI surface
src/components/Lines.tsx    renderers for each output line kind
src/components/ResumeDocument.tsx  server-rendered semantic résumé
src/lib/windows.tsx       window manager state
src/components/desktop/   window chrome, Files browser, résumé preview
```

Real durations are displayed; wall-clock is compressed 14× so a "12 second" suite
plays in about four.

## Accessibility, SEO, print

Three audiences never see the runner and are all handled deliberately:

- **Search engines** get real text in the initial HTML response (`ResumeDocument` is
  server-rendered) plus `Person` JSON-LD.
- **Screen readers** get that same clean document first, before the app.
- **Printers** get an actual formatted résumé — the runner chrome is `display: none`.

`prefers-reduced-motion` skips the animation entirely and renders the finished output.
`Esc` does the same on demand.

## The suite that tests this site

The runner on the page is a dramatisation. **This** is the real thing: 68 Playwright
tests × 2 projects (desktop Chrome, Pixel 7), run by GitHub Actions on every push.
The badge above is its actual conclusion, and so is the one in the site's status bar —
type `ci` in the terminal for the detail.

That badge reads two sources, in order:

1. **`/ci-status.json`**, written by the pipeline itself ([`scripts/ci-status.mjs`](scripts/ci-status.mjs))
   into the build that gets deployed. Same-origin, no CORS, no rate limit, and it carries
   real test counts.
2. **The public GitHub Actions API**, as a fallback for local dev.

The API is deliberately *not* primary. It's anonymous and limited to 60 requests/hour
**per IP**, so one corporate NAT — exactly where a hiring manager sits — can exhaust it
for everyone behind it and leave the badge dead. A test asserts the published file is
preferred and that zero API requests are made when it's present.

```bash
npm run build && npm run test:e2e     # the whole suite
npm run test:e2e:ui                   # interactive
npm run test:e2e:report               # last HTML report
```

What it covers:

| Spec | What it defends |
| --- | --- |
| `runner.spec.ts` | The suite settles; no assertion is left pending; **exactly one** fails and it is `availability`; summary counts reconcile against the rendered lines; reduced-motion skips straight to the finished output |
| `terminal.spec.ts` | The parser — `--grep`, `--failed`, `ls`, `cat`, `coverage`, aliases, tab completion, history, and one regression test for consecutive commands swallowing each other's output |
| `report.spec.ts` | The **shared-state claim**: clicking a spec writes the command into the terminal, `open` moves the report, clicking an assertion opens its trace. If those two surfaces ever drift apart, these fail |
| `ci.spec.ts` | The live badge, with both sources intercepted so the suite is deterministic — published-file path, API fallback, rate-limited, network failure, and that the published file wins without touching the API |
| `desktop.spec.ts` | The window manager — traffic lights, dragging, the dock, right-click menus, that windows never overflow the viewport, that clicking a spec file drives the shared runner state, and that phones get no windows at all |
| `discoverability.spec.ts` | SSR résumé present in the raw HTML response, `Person` JSON-LD parses, accessible names on assertion rows, no horizontal overflow at any width, and that **no phone-shaped string exists in the HTML or the DOM** before a user gesture |

Elements are addressed by `data-testid` and accessible name, never by CSS class.

## Develop

```bash
npm run dev
```

## Deploy

Deployed on Vercel from `main`; every push redeploys. The canonical origin comes
from `VERCEL_PROJECT_PRODUCTION_URL` at build time, so attaching a custom domain
needs no code change.

The suite can be pointed at a deployed origin to smoke-test it:

```bash
BASE_URL=https://portfolio-nine-woad-35.vercel.app npx playwright test
```

No local server is started when `BASE_URL` is remote.
