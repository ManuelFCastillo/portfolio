/**
 * The email address, kept out of the raw HTML.
 *
 * Different threat model to `phone.ts`, and so a different trade-off. The
 * phone number is something a visitor rarely needs, so it hides behind a
 * click. The email address is the whole point of the page — a recruiter must
 * be able to reach it in one click — so it is decoded on mount and rendered as
 * an ordinary `mailto:` link. A human sees no difference at all.
 *
 * What this defeats: harvesters that fetch HTML and regex for addresses, which
 * is how bulk collection works. What it does not defeat: anything running a
 * real browser. That is a deliberate ceiling — the alternative is making
 * himself harder to hire.
 *
 * Cost: the address is absent from the server response, so it is no longer in
 * the initial HTML for crawlers. LinkedIn stays in the clear and carries the
 * contact signal for search engines instead.
 */

const ENCODED = "==QbvNmLslWYtdGQvxGbpR3chNkLulGbr5WYyZkLsVWduFWT";

/** Shown for the instant before hydration; carries no address information. */
export const EMAIL_MASK = "••••••••@••••••.•••";

/** Browser-only. Returns "" anywhere a scraper might be reading. */
export function decodeEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return atob([...ENCODED].reverse().join(""));
  } catch {
    return "";
  }
}

export function mailtoHref(email: string): string {
  return `mailto:${email}`;
}
