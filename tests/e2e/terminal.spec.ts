import { expect, test } from "@playwright/test";
import { prompt, runCommand, settleRun, terminal } from "./helpers";

test.describe("command line", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await settleRun(page);
    await runCommand(page, "clear");
  });

  test("help lists the available commands", async ({ page }) => {
    await runCommand(page, "help");
    const out = terminal(page);
    for (const cmd of ["test --grep", "coverage", "cat resume.md", "source"]) {
      await expect(out).toContainText(cmd);
    }
  });

  test("--grep narrows the run to matching assertions", async ({ page }) => {
    await runCommand(page, "test --grep maestro");
    await expect(page.getByTestId("run-state")).toHaveText("idle");

    const lines = page.locator('[data-testid="test-line"]');
    await expect(lines).toHaveCount(1);
    await expect(lines).toContainText(/Maestro/i);
    await expect(terminal(page)).toContainText("Running 1 test");
  });

  test("--grep against a technology matches across specs", async ({ page }) => {
    await runCommand(page, "test --grep python");
    await expect(page.getByTestId("run-state")).toHaveText("idle");
    const count = await page.locator('[data-testid="test-line"]').count();
    expect(count).toBeGreaterThan(1);
  });

  test("--failed re-runs only the failing assertion", async ({ page }) => {
    await runCommand(page, "test --failed");
    await expect(page.getByTestId("run-state")).toHaveText("idle");

    const lines = page.locator('[data-testid="test-line"]');
    await expect(lines).toHaveCount(1);
    await expect(lines).toHaveAttribute("data-status", "failed");
  });

  test("ls lists the spec files in a suite", async ({ page }) => {
    await runCommand(page, "ls career");
    const out = terminal(page);
    for (const f of ["sorcero", "playstation", "symantec", "emc"]) {
      await expect(out).toContainText(`career/${f}.spec.ts`);
    }
  });

  test("ls lists the tools suite alongside career", async ({ page }) => {
    await runCommand(page, "ls tools");
    const out = terminal(page);
    await expect(out).toContainText("tools/sorceror.spec.ts");
    await expect(out).toContainText("tools/tesseract.spec.ts");
  });

  test("--grep reaches the project work", async ({ page }) => {
    await runCommand(page, "test --grep tesseract");
    await expect(page.getByTestId("run-state")).toHaveText("idle");
    const lines = page.locator('[data-testid="test-line"]');
    expect(await lines.count()).toBeGreaterThan(1);
    await expect(terminal(page)).toContainText("tools/tesseract.spec.ts");
  });

  test("cat resume.md prints the résumé as text", async ({ page }) => {
    await runCommand(page, "cat resume.md");
    await expect(terminal(page)).toContainText(/Senior SDET with \d+\+ years/);
  });

  test("coverage renders the skills table", async ({ page }) => {
    await runCommand(page, "coverage");
    const out = terminal(page);
    await expect(out).toContainText("% Stmts");
    await expect(out).toContainText("Playwright (TypeScript)");
    await expect(out).toContainText("Maestro (iOS)");
  });

  test("unknown commands report an error rather than failing silently", async ({
    page,
  }) => {
    await runCommand(page, "definitely-not-a-command");
    await expect(terminal(page)).toContainText(
      "command not found: definitely-not-a-command",
    );
  });

  test("bad arguments report a specific error per command", async ({ page }) => {
    await runCommand(page, "cat nope.txt");
    await expect(terminal(page)).toContainText("cat: nope.txt: no such file");

    await runCommand(page, "ls nowhere");
    await expect(terminal(page)).toContainText("ls: nowhere: no such directory");

    await runCommand(page, "open nothing");
    await expect(terminal(page)).toContainText("open: nothing: no such spec");
  });

  test("consecutive commands do not swallow each other's output", async ({
    page,
  }) => {
    // Regression: the reducer used to replace the queue instead of appending,
    // so a command submitted while output streamed lost the previous result.
    const input = prompt(page);
    await input.click();
    for (const cmd of ["whoami", "bad-one", "cat nope.txt"]) {
      await input.fill(cmd);
      await input.press("Enter");
    }
    const out = terminal(page);
    await expect(out).toContainText("Manny Castillo");
    await expect(out).toContainText("command not found: bad-one");
    await expect(out).toContainText("cat: nope.txt: no such file");
  });

  test("clear empties the screen", async ({ page }) => {
    await runCommand(page, "whoami");
    await expect(terminal(page)).toContainText("Manny Castillo");
    await runCommand(page, "clear");
    await expect(terminal(page)).not.toContainText("Manny Castillo");
  });

  test("arrow up recalls the previous command", async ({ page }) => {
    await runCommand(page, "whoami");
    const input = prompt(page);
    await input.click();
    await input.press("ArrowUp");
    await expect(input).toHaveValue("whoami");
    await input.press("ArrowDown");
    await expect(input).toHaveValue("");
  });

  test("tab completes a unique command prefix", async ({ page }) => {
    const input = prompt(page);
    await input.click();
    await input.fill("cov");
    await input.press("Tab");
    await expect(input).toHaveValue("coverage ");
  });

  test("npx playwright test is accepted as an alias", async ({ page }) => {
    await runCommand(page, "npx playwright test --grep symantec");
    await expect(page.getByTestId("run-state")).toHaveText("idle");
    await expect(terminal(page)).toContainText("career/symantec.spec.ts");
  });
});
