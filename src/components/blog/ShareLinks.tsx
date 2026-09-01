"use client";

import { useState } from "react";

/**
 * End-of-post share row.
 *
 * LinkedIn only: it is where this writing's audience is, and its share
 * endpoint reads the page's OpenGraph tags, so the card renders from the
 * metadata each post already declares rather than anything passed here.
 * Copy-link sits beside it because most sharing is a paste into Slack or a
 * DM, not a public post.
 */
const SITE = "https://www.mannycastillo.dev";

function Icon({ d, filled = false }: { d: string; filled?: boolean }) {
  return (
    <svg
      className="ns-ico"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d.split("|").map((seg) => (
        <path key={seg} d={seg} />
      ))}
    </svg>
  );
}

const LINK =
  "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71|M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71";
const CHECK = "M20 6 9 17l-5-5";

export function ShareLinks({
  slug,
  placement = "end",
}: {
  slug: string;
  /** "top" drops the rule and tightens the margins for the hero. */
  placement?: "top" | "end";
}) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE}/blog/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked (insecure context, or denied): leave the label alone */
    }
  }

  return (
    <div className={`share-row${placement === "top" ? " share-top" : ""}`}>
      <span className="share-label">Share</span>
      <a
        className="ns-pill ns-btn"
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg
          className="ns-ico"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.65h.05A4.17 4.17 0 0 1 16.6 8.7c4 0 4.74 2.6 4.74 6V21h-4v-5.5c0-1.31-.02-3-1.85-3-1.85 0-2.13 1.44-2.13 2.9V21H9z" />
        </svg>
        LinkedIn
      </a>
      <button type="button" className="ns-pill ns-btn" onClick={copy}>
        <Icon d={copied ? CHECK : LINK} />
        {copied ? "copied" : "copy link"}
      </button>
    </div>
  );
}
