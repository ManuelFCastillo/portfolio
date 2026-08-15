/**
 * The phone number, kept away from harvesters.
 *
 * This is obfuscation, not security. Anyone reading this file can recover the
 * number in about ten seconds, and that is fine — the threat model is bulk
 * automated collection, not a determined human. Those scrapers match
 * phone-shaped patterns in HTML, do not execute JavaScript, and do not click
 * buttons, so the number is withheld at three layers:
 *
 *   1. Not in the repository as digits — stored reversed-base64, which no
 *      phone regex matches.
 *   2. Not in the server-rendered HTML — decoding only ever runs in a browser.
 *   3. Not in the DOM at rest — it materialises on a real user gesture.
 *
 * Email and LinkedIn are deliberately left in the clear: they are the routes
 * he actually wants used, and both survive spam filtering far better than a
 * phone number survives a robocall list.
 */

const ENCODED = "wAzM20CO2MTLyETN";

/** Shown until a visitor asks for the real thing. */
export const PHONE_MASK = "512-•••-••••";

/** Browser-only. Returns "" if called anywhere a scraper might be watching. */
export function decodePhone(): string {
  if (typeof window === "undefined") return "";
  try {
    return atob([...ENCODED].reverse().join(""));
  } catch {
    return "";
  }
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/\D/g, "")}`;
}
