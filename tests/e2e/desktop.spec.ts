import { expect, test } from "@playwright/test";
import { ensureTerminal, settleRun } from "./helpers";

/** Windows only exist at desktop widths; the mobile project asserts the opposite. */
const DESKTOP_ONLY = 900;

test.describe("windowed desktop", () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) < DESKTOP_ONLY,
    "windows are a desktop affordance",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await settleRun(page);
    await ensureTerminal(page);
  });

  test("opens with a files window and a terminal window", async ({ page }) => {
    await expect(page.getByTestId("desktop")).toBeVisible();
    await expect(page.getByTestId("window-files")).toBeVisible();
    await expect(page.getByTestId("window-terminal")).toBeVisible();
  });

  test("the files window lists the résumé and every spec", async ({ page }) => {
    const files = page.getByTestId("window-files");
    await expect(files.getByText("manny-castillo-resume.pdf")).toBeVisible();
    for (const spec of ["sorcero", "playstation", "tesseract", "sorceror"]) {
      await expect(files.getByText(`${spec}.spec.ts`)).toBeVisible();
    }
  });

  test("windows never hang off the bottom of the desktop", async ({ page }) => {
    // Regression: the résumé window overflowed, putting its download button
    // out of reach.
    await page.getByTestId("file-entry").and(page.locator('[data-kind="pdf"]')).click();
    const win = page.getByTestId("window-resume");
    await expect(win).toBeVisible();

    const box = (await win.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await expect(page.getByTestId("preview-download")).toBeInViewport();
  });

  test("opening the résumé embeds the real PDF and offers a download", async ({
    page,
  }) => {
    await page.getByTestId("file-entry").and(page.locator('[data-kind="pdf"]')).click();

    const win = page.getByTestId("window-resume");
    await expect(win).toBeVisible();
    await expect(win.locator("iframe")).toHaveAttribute(
      "src",
      /manny-castillo-resume\.pdf/,
    );
    await expect(page.getByTestId("preview-download")).toHaveAttribute(
      "download",
      "",
    );
  });

  test("traffic lights close, minimize and zoom", async ({ page }) => {
    const files = page.getByTestId("window-files");

    await files.getByRole("button", { name: /^Zoom/ }).click();
    await expect(files).toHaveAttribute("data-maximized", "true");
    await files.getByRole("button", { name: /^Restore/ }).click();
    await expect(files).toHaveAttribute("data-maximized", "false");

    await files.getByRole("button", { name: /^Minimize/ }).click();
    await expect(files).toBeHidden();
    await expect(page.getByTestId("dock")).toContainText("files");

    await page.getByTestId("dock").getByRole("button", { name: "files" }).click();
    await expect(files).toBeVisible();

    await files.getByRole("button", { name: /^Close/ }).click();
    await expect(files).toBeHidden();
  });

  test("a window can be dragged by its title bar", async ({ page }) => {
    const win = page.getByTestId("window-terminal");
    const before = (await win.boundingBox())!;

    const bar = win.locator("header");
    const b = (await bar.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 - 120, b.y + b.height / 2 + 40, {
      steps: 8,
    });
    await page.mouse.up();

    const after = (await win.boundingBox())!;
    expect(Math.abs(after.x - before.x)).toBeGreaterThan(40);
  });

  test("right-click offers Download on the résumé", async ({ page }) => {
    await page
      .getByTestId("file-entry")
      .and(page.locator('[data-kind="pdf"]'))
      .click({ button: "right" });

    const menu = page.getByTestId("context-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Open" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Download" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });

  test("spec files are not offered a download", async ({ page }) => {
    await page
      .getByTestId("file-entry")
      .and(page.locator('[data-kind="spec"]'))
      .first()
      .click({ button: "right" });

    const menu = page.getByTestId("context-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Download" })).toHaveCount(0);
  });

  /** The desktop is a third surface over the same state, not a separate app. */
  test("clicking a spec file drives the shared runner state", async ({ page }) => {
    await page.getByTestId("window-files").getByText("tesseract.spec.ts").click();

    const detail = page.getByTestId("spec-detail");
    await expect(detail).toHaveAttribute("data-spec", "tesseract");
    await expect(detail).toContainText("Three.js");
  });

  test("clicking resume.md types the command into the terminal", async ({
    page,
  }) => {
    await page.getByTestId("window-files").getByText("resume.md").click();
    await expect(page.getByTestId("terminal-output")).toContainText(
      "cat resume.md",
    );
    await expect(page.getByTestId("terminal-output")).toContainText(
      /Senior SDET with \d+\+ years/,
    );
  });
});

test.describe("no windows on a phone", () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) >= DESKTOP_ONLY,
    "only meaningful at phone widths",
  );

  test("the terminal renders plain and full-bleed", async ({ page }) => {
    await page.goto("/");
    await settleRun(page);
    await ensureTerminal(page);

    await expect(page.getByTestId("terminal-output")).toBeVisible();
    await expect(page.getByTestId("desktop")).toHaveCount(0);
    await expect(page.getByTestId("window-terminal")).toHaveCount(0);
  });
});
