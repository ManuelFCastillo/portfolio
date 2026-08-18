import { expect, test } from "@playwright/test";
import { ensureTerminal, openReport, openTerminal, runCommand, settleRun, terminal } from "./helpers";

test.describe("landing", () => {
  test("the report is what a visitor lands on, not the terminal", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("overview")).toBeVisible();
    await expect(page.getByTestId("tab-report")).toHaveAttribute(
      "aria-current",
      "page",
    );
    // The runner is still executing behind it — the concept isn't lost.
    await expect(page.getByTestId("run-state")).toHaveText("running");
  });

  test("the terminal is one click away", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("open-terminal-cta").click();
    await expect(
      page.getByRole("textbox", { name: /command input/i }),
    ).toBeVisible();
  });

  test("the résumé is downloadable as a real PDF", async ({ page, request }) => {
    await page.goto("/");
    const link = page.getByTestId("resume-download");
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("download", "");

    const href = await link.getAttribute("href");
    const res = await request.get(href!);
    expect(res.status(), "the linked PDF must actually exist").toBe(200);
    expect(res.headers()["content-type"]).toContain("pdf");

    // A PDF that leaks the phone number would undo src/lib/phone.ts.
    const body = (await res.body()).toString("latin1");
    expect(body).not.toContain("512-368-6300");
    expect(body).not.toContain("5123686300");
  });
});

test.describe("HTML report", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await settleRun(page);
    await openReport(page);
  });

  test("overview shows totals that match the run", async ({ page }) => {
    const overview = page.getByTestId("overview");
    await expect(overview).toBeVisible();
    await expect(overview).toContainText("Manny Castillo");
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
    await expect(detail).toContainText("2020 — 2026");
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
    await expect(overview).toContainText("Ask the Library");
    await expect(overview).toContainText("Sorcero: Tesseract");
  });

  test("work is labelled by where it came from", async ({ page }) => {
    // Scoped by testid: a sibling combinator also swept in the contact block.
    const cards = page
      .locator('[data-testid="spec-grid"][data-heading="projects"]')
      .getByRole("button");

    // Personal projects first, internal tooling last.
    await expect(cards.first()).toContainText("Ask the Library");
    await expect(cards.last()).toContainText("Tesseract");

    const grid = page.locator(
      '[data-testid="spec-grid"][data-heading="projects"]',
    );
    // Internal tooling is flagged because it cannot be clicked through to.
    await expect(grid.getByTestId("internal-badge")).toHaveCount(2);
    // Contract work is flagged because paid delivery is a stronger claim.
    await expect(grid.getByTestId("contract-badge")).toHaveCount(1);
    // Personal work is the default and carries nothing.
    await expect(cards.first().getByTestId("internal-badge")).toHaveCount(0);
    await expect(cards.first().getByTestId("contract-badge")).toHaveCount(0);
  });

  test("Fare reads as client work, not a side project", async ({ page }) => {
    await page
      .getByTestId("overview")
      .getByRole("button", { name: /^Fare/ })
      .click();

    const detail = page.getByTestId("spec-detail");
    await expect(detail).toHaveAttribute("data-spec", "fare");
    await expect(detail).toContainText("Fare Technologies");
    await expect(detail).toContainText("SLVRLeaf");
    await expect(detail.getByTestId("contract-badge")).toBeVisible();
  });

  test("the badge carries through to the spec detail", async ({ page }) => {
    await page
      .getByTestId("overview")
      .getByRole("button", { name: /^Sorceror/ })
      .click();
    await expect(
      page.getByTestId("spec-detail").getByTestId("internal-badge"),
    ).toBeVisible();

    await page.getByTestId("tab-report").click();
    await page.getByTestId("spec-detail").isVisible().catch(() => {});
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
    await ensureTerminal(page);
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

/**
 * Projects nobody can go and run need evidence, not just prose. The
 * screenshot has to actually load and be enlargeable — an illegible thumbnail
 * is decoration.
 */
test.describe("project screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await settleRun(page);
    await openReport(page);
    await page
      .getByTestId("overview")
      .getByRole("button", { name: /^Ask the Library/ })
      .click();
  });

  test("the reader screenshot loads and is described", async ({ page }) => {
    const img = page.getByTestId("screenshots").locator("img").first();
    // next/image lazy-loads, so it must be in view before it will decode.
    await img.scrollIntoViewIfNeeded();
    await expect(img).toBeVisible();

    // Actually decoded, not just an <img> tag pointing at a 404.
    await expect
      .poll(
        () => img.evaluate((el) => (el as HTMLImageElement).naturalWidth),
        { message: "screenshot never decoded" },
      )
      .toBeGreaterThan(0);

    await expect(img).toHaveAttribute("alt", /VocabLens/);
  });

  test("clicking it opens a lightbox that Escape closes", async ({ page }) => {
    await page.getByTestId("screenshot-open").first().click();
    const box = page.getByTestId("screenshot-lightbox");
    await expect(box).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(box).toBeHidden();
  });

  /**
   * The existing "opens a lightbox" test passed while the lightbox was broken:
   * it was visible, and Escape closed it — but `position: fixed` was anchored
   * to an ancestor carrying a transform, so the overlay rendered 533px wide and
   * mostly above the viewport, and the enlarged image came out 2px across.
   * Enlarging is the whole point, so assert the geometry, not the existence.
   */
  test("the lightbox covers the viewport and the image actually enlarges", async ({
    page,
  }) => {
    const thumb = page.getByTestId("screenshots").locator("img").first();
    await thumb.scrollIntoViewIfNeeded();
    const thumbBox = (await thumb.boundingBox())!;

    await page.getByTestId("screenshot-open").first().click();
    const overlay = page.getByTestId("screenshot-lightbox");
    await expect(overlay).toBeVisible();

    const viewport = page.viewportSize()!;
    const overlayBox = (await overlay.boundingBox())!;
    expect(overlayBox.x).toBe(0);
    expect(overlayBox.y).toBe(0);
    expect(overlayBox.width).toBe(viewport.width);
    expect(overlayBox.height).toBe(viewport.height);

    const zoomed = overlay.locator("img");
    const zoomedBox = (await zoomed.boundingBox())!;
    expect(zoomedBox.width).toBeGreaterThan(thumbBox.width);
    // Fills the overlay bar its padding, rather than merely being "bigger".
    expect(zoomedBox.width).toBeGreaterThan(viewport.width * 0.7);

    // And the pixels arrive: the overlay used to request a variant the
    // thumbnail had not fetched, so it opened on an undecoded image.
    await expect
      .poll(
        () => zoomed.evaluate((el) => (el as HTMLImageElement).naturalWidth),
        { message: "the enlarged image never decoded" },
      )
      .toBeGreaterThan(thumbBox.width);
  });

  /**
   * Fitting the image to the viewport is not the same as making it readable:
   * fitted, a 1600px screenshot lands at ~1216px on a desktop and ~380px on a
   * phone, and the UI text in it is still too small to read. The second stage
   * is the one that answers "let me see that detail".
   */
  test("clicking the enlarged image magnifies it to full size and back", async ({
    page,
  }) => {
    await page.getByTestId("screenshot-open").first().click();
    const img = page.getByTestId("screenshot-zoomed");
    await expect(img).toHaveAttribute("data-magnified", "false");

    const fitted = (await img.boundingBox())!;
    await img.click();

    await expect(page.getByTestId("screenshot-zoomed")).toHaveAttribute(
      "data-magnified",
      "true",
    );
    const magnified = (await page.getByTestId("screenshot-zoomed").boundingBox())!;
    // Zoom stops are multiples of the image's natural size, and both test
    // viewports fit a 1600px screenshot below 100%, so one click lands on
    // exactly 100% — full size, and larger than the fitted view.
    await expect(page.getByTestId("zoom-level")).toHaveText("100%");
    expect(magnified.width).toBeGreaterThan(fitted.width);

    // Clicking it again returns to the fitted view rather than closing.
    await page.getByTestId("screenshot-zoomed").click();
    await expect(page.getByTestId("screenshot-zoomed")).toHaveAttribute(
      "data-magnified",
      "false",
    );
    await expect(page.getByTestId("screenshot-lightbox")).toBeVisible();
  });

  test("a magnified image can be panned and is centred on the click", async ({
    page,
  }) => {
    await page.getByTestId("screenshot-open").first().click();
    const img = page.getByTestId("screenshot-zoomed");
    const fitted = (await img.boundingBox())!;

    // Click the right-hand side: the magnified view should open scrolled
    // towards it rather than at the left edge.
    await img.click({
      position: { x: fitted.width * 0.85, y: fitted.height / 2 },
    });
    const pane = page.getByTestId("screenshot-pane");
    await expect(page.getByTestId("screenshot-zoomed")).toHaveAttribute(
      "data-magnified",
      "true",
    );

    const scrollable = await pane.evaluate(
      (el) => el.scrollWidth > el.clientWidth,
    );
    if (!scrollable) return; // viewport already fits the source at 1:1

    // Not just "scrolled at all": the clicked point must end up near the
    // centre. Asserting > 0 passed even while the scroll target was computed
    // against the pre-zoom layout, because a click far enough right still
    // produced a positive number.
    const centred = await pane.evaluate((el) => {
      const want = 0.85 * el.scrollWidth - el.clientWidth / 2;
      const max = el.scrollWidth - el.clientWidth;
      return { got: el.scrollLeft, want: Math.max(0, Math.min(max, want)) };
    });
    expect(Math.abs(centred.got - centred.want)).toBeLessThan(40);

    // Dragging pans, and does not toggle back to the fitted view. Drag to the
    // right — the view opened near the image's right edge, so panning further
    // that way would just clamp at scrollWidth and prove nothing.
    const before = await pane.evaluate((el) => el.scrollLeft);
    const box = (await pane.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, {
      steps: 8,
    });
    await page.mouse.up();

    await expect.poll(() => pane.evaluate((el) => el.scrollLeft)).toBeLessThan(before);
    await expect(page.getByTestId("screenshot-zoomed")).toHaveAttribute(
      "data-magnified",
      "true",
    );
  });

  test("the zoom controls step, clamp, and report the level", async ({
    page,
  }) => {
    await page.getByTestId("screenshot-open").first().click();
    const level = page.getByTestId("zoom-level");
    const zoomIn = page.getByTestId("zoom-in");
    const zoomOut = page.getByTestId("zoom-out");

    // Fitted reads as its true fraction of full size — under 100% on both test
    // viewports — and there is nothing to zoom out of yet.
    // Polled: the fraction is only known once the pane has been measured, so
    // the label starts as a placeholder rather than a wrong number.
    const read = async () => Number((await level.textContent())!.replace("%", ""));
    await expect.poll(read).toBeLessThan(100);
    const fittedLevel = await read();
    await expect(zoomOut).toBeDisabled();

    // The first stop above fit is full size.
    await zoomIn.click();
    await expect(level).toHaveText("100%");
    await expect(zoomOut).toBeEnabled();

    await zoomIn.click();
    await expect(level).toHaveText("150%");

    // And zooming back out bottoms out at fit, not at the smallest stop.
    await zoomOut.click();
    await expect(level).toHaveText("100%");
    await zoomOut.click();
    await expect(level).toHaveText(`${fittedLevel}%`);
    await expect(zoomOut).toBeDisabled();
    await zoomIn.click();

    // Clamps at the top rather than growing without limit. Bounded on the
    // enabled state: clicking a disabled button makes Playwright wait for
    // actionability until the test times out.
    for (let i = 0; i < 20 && (await zoomIn.isEnabled()); i += 1) {
      await zoomIn.click();
    }
    await expect(level).toHaveText("300%");
    await expect(zoomIn).toBeDisabled();

    // And the controls do not close the overlay when clicked.
    await expect(page.getByTestId("screenshot-lightbox")).toBeVisible();
  });

  test("specs without screenshots render nothing extra", async ({ page }) => {
    // Start clean: the Report tab keeps whatever spec is already open.
    await page.goto("/");
    await settleRun(page);
    await openReport(page);
    await page
      .getByTestId("overview")
      .getByRole("button", { name: /^Sorcero Inc\./ })
      .click();
    await expect(page.getByTestId("spec-detail")).toHaveAttribute(
      "data-spec",
      "sorcero",
    );
    await expect(page.getByTestId("screenshots")).toHaveCount(0);
  });
});
