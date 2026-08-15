import { expect, test } from "@playwright/test";
import { openReport, openTerminal, runCommand, settleRun, terminal } from "./helpers";

test.describe("HTML report", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await settleRun(page);
    await openReport(page);
  });

  test("overview shows totals that match the run", async ({ page }) => {
    const overview = page.getByTestId("overview");
    await expect(overview).toBeVisible();
    await expect(overview).toContainText("Manuel Castillo");
    // Labels are uppercased in CSS; the DOM text is lowercase.
    await expect(overview).toContainText(/passed/i);
    await expect(overview).toContainText(/failed/i);
    await expect(overview).toContainText("Coverage");
    await expect(overview).toContainText("Education");

    // The report and the status bar must agree — they read the same state.
    const statusBar = await page.getByTestId("passed-count").textContent();
    const passed = statusBar?.match(/\d+/)?.[0];
    await expect(overview).toContainText(passed!);
  });

  test("opening a spec reveals the role, employer and assertions", async ({
    page,
  }) => {
    await page
      .getByTestId("overview")
      // Anchored: "Sorceror" contains "Sorcero", and so does "Sorcero: Tesseract".
      .getByRole("button", { name: /^Sorcero Inc\./ })
      .click();

    const detail = page.getByTestId("spec-detail");
    await expect(detail).toHaveAttribute("data-spec", "sorcero");
    await expect(detail).toContainText("Sorcero Inc.");
    await expect(detail).toContainText("2020 — Present");
    await expect(detail).toContainText("Maestro");
    await expect(detail).toContainText("Assertions");
  });

  test("an assertion expands to show its detail", async ({ page }) => {
    await page
      .getByTestId("overview")
      // Anchored: "Sorceror" contains "Sorcero", and so does "Sorcero: Tesseract".
      .getByRole("button", { name: /^Sorcero Inc\./ })
      .click();

    const assertion = page.getByRole("button", { name: /Maestro end-to-end flows/ });
    await expect(assertion).toHaveAttribute("aria-expanded", "false");
    await assertion.click();
    await expect(assertion).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("spec-detail")).toContainText(
      "native mobile app",
    );
  });

  test("projects are presented separately from employment", async ({ page }) => {
    const overview = page.getByTestId("overview");
    await expect(overview).toContainText("Experience");
    await expect(overview).toContainText("Projects");
    await expect(overview).toContainText("Sorceror");
    await expect(overview).toContainText("Sorcero: Tesseract");
  });

  test("the Chrome extension project opens with its detail", async ({ page }) => {
    await page
      .getByTestId("overview")
      .getByRole("button", { name: /^Sorceror/ })
      .click();

    const detail = page.getByTestId("spec-detail");
    await expect(detail).toHaveAttribute("data-spec", "sorceror");
    await expect(detail).toContainText("Chrome extension");
    await expect(detail).toContainText("Caching");

    await detail.getByRole("button", { name: /auth token copied/ }).click();
    await expect(detail).toContainText("manual token-fetching step");
  });

  test("the visual runner project shows its 3D stack and DR use", async ({
    page,
  }) => {
    await page
      .getByTestId("overview")
      .getByRole("button", { name: /Tesseract/ })
      .click();

    const detail = page.getByTestId("spec-detail");
    await expect(detail).toHaveAttribute("data-spec", "tesseract");
    await expect(detail).toContainText("Three.js");
    await expect(detail).toContainText("D3.js");
    await expect(detail).toContainText("Disaster Recovery");

    await detail
      .getByRole("button", { name: /compared side by side across regions/ })
      .click();
    await expect(detail).toContainText("two regions");
  });

  test("the availability spec carries the contact routes", async ({ page }) => {
    // Reached from the failing-test callout rather than a spec card.
    await page
      .getByTestId("overview")
      .getByRole("button", { name: "availability.spec.ts" })
      .click();

    const detail = page.getByTestId("spec-detail");
    await expect(detail).toHaveAttribute("data-spec", "availability");
    await detail.getByRole("button", { name: /off the market/ }).click();
    await expect(
      detail.getByRole("link", { name: /Manuel\.Franklin\.Castillo/ }),
    ).toBeVisible();
  });
});

/**
 * The site's central claim is that the terminal and the report are two
 * renderers over one state machine. If that is true, driving either surface
 * must move the other. These are the tests that would catch it becoming a lie.
 */
test.describe("shared state between surfaces", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await settleRun(page);
  });

  test("clicking a spec in the report writes the command into the terminal", async ({
    page,
  }) => {
    await openReport(page);
    await page
      .getByTestId("overview")
      .getByRole("button", { name: /Symantec/ })
      .click();

    await openTerminal(page);
    await expect(terminal(page)).toContainText("open career/symantec.spec.ts");
  });

  test("running open in the terminal moves the report", async ({ page }) => {
    await runCommand(page, "open career/emc.spec.ts");
    // The command switches the view on its own.
    const detail = page.getByTestId("spec-detail");
    await expect(detail).toHaveAttribute("data-spec", "emc");
    await expect(detail).toContainText("Hopkinton, MA");
  });

  test("clicking an assertion in the terminal opens it in the report", async ({
    page,
  }) => {
    await page
      .locator('[data-testid="test-line"][data-status="failed"]')
      .click();

    const detail = page.getByTestId("spec-detail");
    await expect(detail).toHaveAttribute("data-spec", "availability");
    await expect(detail).toContainText("Received:");
  });

  test("the report tab badges the failure count from the same state", async ({
    page,
  }) => {
    await expect(page.getByTestId("tab-report")).toContainText("1");
  });
});
