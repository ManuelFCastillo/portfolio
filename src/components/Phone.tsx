"use client";

import { useState } from "react";
import { decodePhone, PHONE_MASK, telHref } from "@/lib/phone";

/**
 * Renders a masked number until a visitor asks for it. Before the click there
 * is nothing phone-shaped in the DOM to collect.
 */
export function Phone({ className = "" }: { className?: string }) {
  const [revealed, setRevealed] = useState<string | null>(null);

  if (revealed) {
    return (
      <a
        href={telHref(revealed)}
        data-testid="phone-value"
        className={`text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:text-fg-strong ${className}`}
      >
        {revealed}
      </a>
    );
  }

  return (
    <button
      type="button"
      data-testid="phone-reveal"
      onClick={() => setRevealed(decodePhone())}
      aria-label="Reveal phone number"
      className={`group inline-flex items-baseline gap-2 text-left ${className}`}
    >
      <span className="text-fg-dim tabular-nums">{PHONE_MASK}</span>
      <span className="text-[11px] text-fg-faint transition-colors group-hover:text-accent">
        reveal
      </span>
    </button>
  );
}
