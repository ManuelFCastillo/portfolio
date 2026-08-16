import { expect, type Page } from "@playwright/test";

/** The command input, addressed the way a screen reader would find it. */
export const prompt = (page: Page) =>
  page.getByRole("textbox", { name: /command input/i });

/**
 * The landing animation runs for ~12s of simulated time. Esc flushes it.
 * Every test that needs a finished suite starts here.
 */
export async function settleRun(page: Page) {
  await expect(page.getByTestId("run-state")).toHaveText("running");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("run-state")).toHaveText("idle");
}

/**
 * The report is the landing view, so the terminal has to be opened first —
 * and on phones it is one of several stacked windows behind a switcher, so
 * selecting the Terminal tab is not always enough on its own.
 */
export async function ensureTerminal(page: Page) {
  const input = prompt(page);
  if (await input.isVisible().catch(() => false)) return;

  await page.getByTestId("tab-terminal").click();

  const mobileTab = page.getByTestId("mobile-tab-terminal");
  if (await mobileTab.isVisible().catch(() => false)) {
    await mobileTab.click();
  }
  await expect(input).toBeVisible();
}

export async function runCommand(page: Page, command: string) {
  await ensureTerminal(page);
  const input = prompt(page);
  await input.click();
  await input.fill(command);
  await input.press("Enter");
}

/** Output text of the terminal pane. */
export const terminal = (page: Page) => page.getByTestId("terminal-output");

// Addressed by testid, not accessible name: Playwright matches `name` as a
// substring, and every assertion row's label ends "…Open in report."
export async function openReport(page: Page) {
  await page.getByTestId("tab-report").click();
}

export async function openTerminal(page: Page) {
  await ensureTerminal(page);
}
