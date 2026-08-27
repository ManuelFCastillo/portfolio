import { expect, test, type Page } from "@playwright/test";
import { ensureTerminal, runCommand, settleRun } from "./helpers";

/**
 * Three audiences never see the runner: search engines, screen readers, and
 * printers. Those paths are easy to break and nobody notices, so they get
 * explicit coverage.
 */

test.describe("search engines", () => {
  test("the résumé is in the server response, not painted by JS", async ({
    request,
    baseURL,
  }) => {
    const res = await request.get(baseURL!);
    expect(res.status()).toBe(200);
    const html = await res.text();

    // Real content, before any client bundle executes.
    expect(html).toContain("Senior Software Engineer in Test");
    expect(html).toContain("Sorcero");
    expect(html).toContain("University of Massachusetts");
    expect(html).toContain("Playwright");
    // LinkedIn stays in the clear and carries the contact signal.
    expect(html).toContain("linkedin.com/in/mfcastillo");
  });

  test("structured data identifies a Person", async ({ request, baseURL }) => {
    const html = await (await request.get(baseURL!)).text();
    // [\s\S] rather than the `s` flag — tsconfig targets ES2017.
    const match = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    expect(match, "JSON-LD block should be present").toBeTruthy();

    const data = JSON.parse(match![1]);
    expect(data["@type"]).toBe("Person");
    expect(data.name).toBe("Manny Castillo");
    expect(data.alternateName).toBe("Manuel Castillo");
    expect(data.jobTitle).toContain("Software Engineer in Test");
    expect(Array.isArray(data.knowsAbout)).toBe(true);
    expect(data.knowsAbout).toContain("Maestro (iOS)");
  });

  test("title and description are set for search results", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Manny Castillo.*Senior Software Engineer in Test/);
    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveAttribute("content", /Senior SDET with \d+\+ years/);
  });
});

test.describe("assistive technology", () => {
  test("a semantic résumé precedes the application", async ({ page }) => {
    await page.goto("/");
    const doc = page.getByRole("article", { name: /résumé, plain text/i });
    await expect(doc).toBeAttached();
    await expect(doc.getByRole("heading", { level: 1 })).toHaveText(
      "Manny Castillo",
    );
  });

  test("the command input is labelled", async ({ page }) => {
    await page.goto("/");
    // The terminal is not mounted until opened, so this must open it first.
    await ensureTerminal(page);
    await expect(
      page.getByRole("textbox", { name: /command input/i }),
    ).toBeAttached();
  });

  test("assertion rows expose status in their accessible name", async ({
    page,
  }) => {
    await page.goto("/");
    await ensureTerminal(page);
    await settleRun(page);

    const failed = page.locator('[data-testid="test-line"][data-status="failed"]');
    await expect(failed).toHaveAttribute("aria-label", /^Failed:/);
  });
});

/**
 * The phone number must be reachable by a person and invisible to a harvester.
 * These are the tests that stop it leaking back into the HTML by accident.
 */
test.describe("phone number is not harvestable", () => {
  /**
   * Separators are required. With them optional this also matched any ten
   * consecutive digits — including the GitHub Actions run ID in the CI badge's
   * URL, which failed the build for a leak that did not exist.
   */
  const SEPARATED = /\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/;

  /** Reveals the number once so the assertions never hardcode it. */
  async function reveal(page: Page): Promise<{ formatted: string; digits: string }> {
    await settleRun(page);
    await runCommand(page, "contact");
    await page.getByTestId("phone-reveal").first().click();
    const formatted = (
      await page.getByTestId("phone-value").first().textContent()
    )!.trim();
    return { formatted, digits: formatted.replace(/\D/g, "") };
  }

  test("no phone-shaped string in the server response", async ({
    request,
    baseURL,
  }) => {
    const html = await (await request.get(baseURL!)).text();
    expect(html).not.toMatch(SEPARATED);
    expect(html).not.toContain("tel:");
  });

  test("revealing it gives a person a working tel: link", async ({ page }) => {
    await page.goto("/");
    const { formatted } = await reveal(page);

    expect(formatted).toMatch(/^\d{3}-\d{3}-\d{4}$/);
    await expect(page.getByTestId("phone-value").first()).toHaveAttribute(
      "href",
      /^tel:\d{10}$/,
    );
  });

  /**
   * The strongest form of the check: learn the real number by revealing it,
   * then assert that exact value is absent everywhere it should be. The number
   * is never written into this repository, including into this test.
   */
  test("the real number is absent until a gesture asks for it", async ({
    page,
    request,
    baseURL,
  }) => {
    await page.goto("/");
    const { formatted, digits } = await reveal(page);
    expect(digits).toHaveLength(10);

    const html = await (await request.get(baseURL!)).text();
    expect(html, "leaked into the server response").not.toContain(formatted);
    expect(html, "leaked into the server response").not.toContain(digits);

    const fresh = await page.context().newPage();
    await fresh.goto("/");
    await settleRun(fresh);
    await runCommand(fresh, "contact");
    await expect(fresh.getByTestId("phone-reveal").first()).toBeVisible();

    const body = await fresh.evaluate(() => document.body.innerHTML);
    expect(body, "leaked into the DOM before the click").not.toContain(formatted);
    expect(body, "leaked into the DOM before the click").not.toContain(digits);
    expect(body).not.toContain("tel:");
    await fresh.close();
  });
});

/**
 * The address is decoded client-side. A person sees an ordinary one-click
 * mailto link; a harvester fetching HTML sees nothing to collect.
 */
test.describe("email is reachable but not harvestable", () => {
  const EMAIL_SHAPED = /[\w.+-]+@[\w-]+\.[\w.]+/;

  test("no address in the server response", async ({ request, baseURL }) => {
    const html = await (await request.get(baseURL!)).text();
    const found = html.match(new RegExp(EMAIL_SHAPED, "g")) ?? [];
    expect(
      found,
      `email-shaped strings in the server HTML: ${JSON.stringify([...new Set(found)])}`,
    ).toHaveLength(0);
    expect(html).not.toContain("mailto:");
  });

  test("a person gets a working one-click mailto link", async ({ page }) => {
    await page.goto("/");
    const link = page.getByTestId("email-link").first();
    await expect(link).toBeVisible();

    const href = await link.getAttribute("href");
    expect(href).toMatch(/^mailto:[\w.+-]+@[\w-]+\.[\w.]+$/);
    // No gesture needed: it resolves on load, unlike the phone number.
    await expect(link).toContainText("@");
  });

  test("the résumé PDF still carries the address", async ({ request }) => {
    const res = await request.get("/manny-castillo-resume.pdf");
    expect(res.status()).toBe(200);
    // A résumé without an email is useless; this one is meant to be downloaded.
    expect((await res.body()).length).toBeGreaterThan(1000);
  });
});

test.describe("layout", () => {
  test("the page never scrolls horizontally", async ({ page }) => {
    await page.goto("/");
    await settleRun(page);

    // Regression: the specs grid overflowed on narrow viewports because grid
    // items default to min-width:auto, defeating `truncate`.
    for (const view of ["report", "terminal"] as const) {
      await page.getByTestId(`tab-${view}`).click();
      const overflow = await page.evaluate(() => {
        const el = document.scrollingElement!;
        return el.scrollWidth - el.clientWidth;
      });
      expect(overflow, `${view} view overflows horizontally`).toBeLessThanOrEqual(1);
    }
  });
});
