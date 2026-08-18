import { expect, test, type Page } from "@playwright/test";
import { runCommand, settleRun, terminal } from "./helpers";

/**
 * The badge reads the pipeline-published `/ci-status.json` first and falls back
 * to the GitHub Actions API. Asserting against the real endpoint would make
 * this suite depend on network conditions and a 60-req/hour anonymous rate
 * limit, so both sources are intercepted and every branch is covered.
 */

const RUNS_API = "https://api.github.com/repos/*/**";
const STATUS_FILE = "**/ci-status.json";

const published = {
  conclusion: "success",
  passed: 46,
  failed: 0,
  flaky: 0,
  skipped: 0,
  durationMs: 41200,
  sha: "abc1234def5678",
  branch: "main",
  runNumber: 7,
  url: "https://github.com/ManuelFCastillo/portfolio/actions/runs/7",
  finishedAt: new Date(Date.now() - 45_000).toISOString(),
};

/** Removes the published file so the API fallback is exercised. */
async function withoutStatusFile(page: Page) {
  await page.route(STATUS_FILE, (route) => route.fulfill({ status: 404, body: "" }));
}

async function stubStatusFile(page: Page, body: unknown) {
  await page.route(STATUS_FILE, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    }),
  );
}

function runFixture(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    workflow_runs: [
      {
        conclusion: "success",
        run_number: 42,
        head_sha: "a1b2c3d4e5f6a7b8c9d0",
        head_branch: "main",
        html_url: "https://github.com/ManuelFCastillo/portfolio/actions/runs/1",
        run_started_at: new Date(now - 92_000).toISOString(),
        created_at: new Date(now - 95_000).toISOString(),
        updated_at: new Date(now - 30_000).toISOString(),
        ...overrides,
      },
    ],
  };
}

async function stubCi(page: Page, body: unknown, status = 200) {
  await page.route(RUNS_API, (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    }),
  );
}

test.describe("badge, from the pipeline-published status", () => {
  test("reports a passing pipeline", async ({ page }) => {
    await stubStatusFile(page, published);
    await page.goto("/");

    const badge = page.getByTestId("ci-badge");
    await expect(badge).toHaveAttribute("data-ci-state", "success");
    await expect(badge).toContainText("CI passing");
    await expect(badge).toHaveAttribute("href", published.url);
  });

  test("reports a failing pipeline", async ({ page }) => {
    await stubStatusFile(page, { ...published, conclusion: "failure", failed: 3 });
    await page.goto("/");

    const badge = page.getByTestId("ci-badge");
    await expect(badge).toHaveAttribute("data-ci-state", "failure");
    await expect(badge).toContainText("CI failing");
  });

  test("is preferred over the API, so no request is made to GitHub", async ({
    page,
  }) => {
    let apiCalls = 0;
    await page.route(RUNS_API, (route) => {
      apiCalls++;
      return route.fulfill({ status: 200, body: JSON.stringify(runFixture()) });
    });
    await stubStatusFile(page, published);
    await page.goto("/");

    await expect(page.getByTestId("ci-badge")).toHaveAttribute(
      "data-ci-state",
      "success",
    );
    // The whole point: visitors behind a shared IP never touch the rate limit.
    expect(apiCalls).toBe(0);
  });
});

test.describe("badge, falling back to the Actions API", () => {
  test("uses the API when no status file was published", async ({ page }) => {
    await withoutStatusFile(page);
    await stubCi(page, runFixture());
    await page.goto("/");

    const badge = page.getByTestId("ci-badge");
    await expect(badge).toHaveAttribute("data-ci-state", "success");
    await expect(badge).toHaveAttribute(
      "href",
      "https://github.com/ManuelFCastillo/portfolio/actions/runs/1",
    );
  });

  test("degrades gracefully when both sources fail", async ({ page }) => {
    await withoutStatusFile(page);
    await stubCi(page, { message: "API rate limit exceeded" }, 403);
    await page.goto("/");

    const badge = page.getByTestId("ci-badge");
    await expect(badge).toHaveAttribute("data-ci-state", "unavailable");
    // The rest of the page must still work.
    await settleRun(page);
    await expect(page.getByTestId("overview")).toBeVisible();
  });

  test("survives a network failure", async ({ page }) => {
    await withoutStatusFile(page);
    await page.route(RUNS_API, (route) => route.abort("failed"));
    await page.goto("/");

    await expect(page.getByTestId("ci-badge")).toHaveAttribute(
      "data-ci-state",
      "unavailable",
    );
    await settleRun(page);
    await expect(page.getByTestId("overview")).toBeVisible();
  });
});

test.describe("ci command", () => {
  test("prints the pipeline detail, including real test counts", async ({
    page,
  }) => {
    await stubStatusFile(page, published);
    await page.goto("/");
    await settleRun(page);
    await runCommand(page, "ci");

    const report = page.getByTestId("ci-report");
    await expect(report).toBeVisible();
    await expect(report).toContainText("success");
    // Counts are the reason the published file beats the API.
    await expect(report).toContainText("46 passed");
    await expect(report).toContainText("#7");
    await expect(report).toContainText("abc1234");
    await expect(report).toContainText("main");
    await expect(report).toContainText("41.2s");
    await expect(
      report.getByRole("link", { name: /view the run/ }),
    ).toBeVisible();
  });

  test("omits test counts when falling back to the API", async ({ page }) => {
    await withoutStatusFile(page);
    await stubCi(page, runFixture());
    await page.goto("/");
    await settleRun(page);
    await runCommand(page, "ci");

    const report = page.getByTestId("ci-report");
    await expect(report).toContainText("via the Actions API");
    await expect(report).toContainText("#42");
    await expect(report).not.toContainText("passed");
  });

  test("explains itself when no run is available", async ({ page }) => {
    await withoutStatusFile(page);
    await stubCi(page, { workflow_runs: [] });
    await page.goto("/");
    await settleRun(page);
    await runCommand(page, "ci");

    await expect(page.getByTestId("ci-report")).toContainText(
      "No completed run available",
    );
  });

  test("help advertises the command", async ({ page }) => {
    await stubStatusFile(page, published);
    await page.goto("/");
    await settleRun(page);
    await runCommand(page, "help");
    await expect(terminal(page)).toContainText("live status of the real");
  });
});

/**
 * The project badge is a different mechanism from the site's own: the repo is
 * private, so nothing is fetched in the browser at all — the build writes
 * `/ci-status-<slug>.json` server-side and the page just reads it. Both states
 * matter, and the absent one matters more: a project must render normally when
 * no token was configured for the build.
 */
test.describe("project CI badge", () => {
  const PROJECT_STATUS = "**/ci-status-ask-the-library.json";

  const projectRun = {
    conclusion: "success",
    passed: null,
    failed: null,
    durationMs: 55_000,
    sha: "0293426e44dbdd",
    branch: "master",
    runNumber: 12,
    url: "https://github.com/ManuelFCastillo/ask-the-library/actions/runs/12",
    finishedAt: new Date(Date.now() - 90_000).toISOString(),
  };

  async function openAskTheLibrary(page: Page) {
    await page.goto("/");
    await settleRun(page);
    await page.getByTestId("tab-report").click();
    await page
      .getByTestId("overview")
      .getByRole("button", { name: /^Ask the Library/ })
      .click();
  }

  test("a published status appears beside the project's period", async ({
    page,
  }) => {
    await page.route(PROJECT_STATUS, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(projectRun),
      }),
    );
    await openAskTheLibrary(page);

    const badge = page.getByTestId("project-ci-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute("data-ci-state", "success");
    await expect(badge).toContainText("CI passing");
    await expect(badge).toHaveAttribute("href", projectRun.url);

    // Beside the period, not somewhere else on the page.
    await expect(
      page.getByTestId("spec-detail").getByText("In progress"),
    ).toBeVisible();
  });

  test("a failing run says so", async ({ page }) => {
    await page.route(PROJECT_STATUS, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...projectRun, conclusion: "failure" }),
      }),
    );
    await openAskTheLibrary(page);

    const badge = page.getByTestId("project-ci-badge");
    await expect(badge).toHaveAttribute("data-ci-state", "failure");
    await expect(badge).toContainText("CI failing");
  });

  test("no published status renders no badge, not a dead one", async ({
    page,
  }) => {
    await page.route(PROJECT_STATUS, (route) =>
      route.fulfill({ status: 404, body: "" }),
    );
    await openAskTheLibrary(page);

    // The spec itself is unaffected.
    await expect(page.getByTestId("spec-detail")).toContainText("In progress");
    await expect(page.getByTestId("project-ci-badge")).toHaveCount(0);
  });
});
