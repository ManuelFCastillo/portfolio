"use client";

import { useSyncExternalStore } from "react";
import { decodeEmail, EMAIL_MASK, mailtoHref } from "@/lib/email";

/**
 * A normal mailto link that happens not to exist in the server HTML.
 *
 * Resolved on the client with no gesture required, so a visitor sees an
 * ordinary one-click email link. The mask is only ever on screen for the
 * instant before hydration, and never to a person in practice.
 *
 * `useSyncExternalStore` rather than setState-in-an-effect: it gives an
 * explicit server snapshot, which is the hydration-safe way to render one
 * thing on the server and another in the browser.
 */

let cached: string | null = null;
/** Cached so the snapshot is referentially stable across renders. */
function clientSnapshot(): string {
  if (cached === null) cached = decodeEmail();
  return cached;
}

const serverSnapshot = () => "";
const subscribe = () => () => {};

export function Email({
  className = "",
  label,
}: {
  /** Extra classes for the link. */
  className?: string;
  /** Render fixed text (e.g. "Email") instead of the address itself. */
  label?: string;
}) {
  const email = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);

  if (!email) {
    return (
      <span
        data-testid="email-pending"
        aria-hidden
        className={`text-fg-dim ${className}`}
      >
        {label ?? EMAIL_MASK}
      </span>
    );
  }

  return (
    <a
      href={mailtoHref(email)}
      data-testid="email-link"
      className={className}
      aria-label={label ? `Email ${email}` : undefined}
    >
      {label ?? email}
    </a>
  );
}
