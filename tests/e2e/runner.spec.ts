import { expect, test } from "@playwright/test";
import { ensureTerminal, settleRun, terminal } from "./helpers";

test.describe("suite execution", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // The report is the landing view; these assert on runner output.
    await ensureTerminal(page);
  });

  test("runs itself on load and reaches a settled state", async ({ page }) => {
    await expect(page.getByTestId("run-state")).toHaveText("running");
    await settleRun(page);
    await expect(page.getByTestId("summary")).toBeVisible();
  });

  test("every assertion resolves — none left pending", async ({ page }) => {
    await settleRun(page);
    const lines = page.getByTestId("test-line");
    const count = await lines.count();
    expect(count).toBeGreaterThan(20);

    for (const status of await lines.evaluateAll((els) =>
      els.map((e) => e.getAttribute("data-status")),
    )) {
      expect(status).toMatch(/^(passed|failed)$/);
    }
  });

  test("exactly one assertion fails, and it is the availability spec", async ({
    page,
  }) => {
    await settleRun(page);

    const failed = page.locator('[data-testid="test-line"][data-status="failed"]');
    await expect(failed).toHaveCount(1);
    await expect(failed).toContainText("off the market");
    await expect(page.getByTestId("failed-count")).toHaveText("1 failed");
  });

  test("summary counts agree with the rendered lines", async ({ page }) => {
    await settleRun(page);

    const total = await page.locator('[data-testid="test-line"]').count();
    const failed = await page
      .locator('[data-testid="test-line"][data-status="failed"]')
      .count();

    const passedText = await page.getByTestId("passed-count").textContent();
    const passed = Number(passedText?.match(/\d+/)?.[0]);

    expect(passed).toBe(total - failed);
    await expect(page.getByTestId("summary")).toContainText(`${passed} passed`);
  });

  test("the failure block exposes real, reachable contact routes", async ({
    page,
  }) => {
    await settleRun(page);
    const block = page.getByTestId("failure-block");
    await expect(block).toBeVisible();
    await expect(block).toContainText("Expected:");
    await expect(block).toContainText("Received:");

    await expect(
      block.getByRole("link", { name: /Manuel\.Franklin\.Castillo@gmail\.com/ }),
    ).toHaveAttribute("href", "mailto:Manuel.Franklin.Castillo@gmail.com");

    await expect(
      block.getByRole("link", { name: /linkedin/ }),
    ).toHaveAttribute("href", "https://linkedin.com/in/manuelfcastillo");
  });

  test("Escape skips the animation instead of dropping output", async ({
    page,
  }) => {
    await settleRun(page);
    // Flushing must not lose lines: the summary is the last thing queued.
    await expect(page.getByTestId("summary")).toBeVisible();
    await expect(terminal(page)).toContainText("Running");
  });
});

test.describe("reduced motion", () => {
  test("renders the finished suite without animating", async ({ page }) => {
    // Must be emulated before the app mounts and reads the media query.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await ensureTerminal(page);
    // No Escape press here — the preference alone must settle it.
    await expect(page.getByTestId("run-state")).toHaveText("idle");
    await expect(page.getByTestId("summary")).toBeVisible();
    await expect(
      page.locator('[data-testid="test-line"][data-status="failed"]'),
    ).toHaveCount(1);
  });
});
