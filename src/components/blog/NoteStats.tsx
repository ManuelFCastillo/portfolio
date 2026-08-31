"use client";

import { useEffect, useState } from "react";
import { posts } from "@/lib/posts";

/**
 * Views / upvotes / hearts / upstream-PR status for a Field Notes post,
 * backed by the notes-stats Cloudflare Worker (one Durable Object per
 * slug; INSERT OR IGNORE on a visitor hash makes counts unique).
 *
 * variant "card": read-only counts + status chip, safe inside the index
 * card <Link> (renders no anchors or buttons).
 * variant "post": interactive — fires the view beacon once per browser
 * (localStorage gate; the server dedups regardless) and offers the
 * upvote / heart toggles, plus a chip linking to the upstream PR.
 */

const API = "https://notes-stats.bitdrop.workers.dev";

interface Upstream {
  state: "open" | "approved" | "changes_requested" | "merged" | "closed" | "unknown";
  url: string;
  repo?: string;
  number?: number;
  additions?: number;
  deletions?: number;
  files?: number;
}
interface Stats {
  views: number;
  up: number;
  heart: number;
  you: { up: boolean; heart: boolean };
  upstream?: Upstream;
}

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
const EYE =
  "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z|M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z";
const UP = "M12 19V6|M5 13l7-7 7 7";
const HEART =
  "M12 21C7 16.5 3 13.3 3 8.9 3 6.2 5.2 4 7.9 4c1.6 0 3.1.8 4.1 2.1C13 4.8 14.5 4 16.1 4 18.8 4 21 6.2 21 8.9c0 4.4-4 7.6-9 12.1Z";

const CHIP: Record<Upstream["state"], { label: string; cls: string } | null> = {
  merged: { label: "merged", cls: "ns-chip ns-merged" },
  open: { label: "pending merge", cls: "ns-chip ns-open" },
  approved: { label: "approved", cls: "ns-chip ns-approved" },
  changes_requested: { label: "changes requested", cls: "ns-chip ns-changes" },
  closed: { label: "pr closed", cls: "ns-chip ns-closed" },
  unknown: null,
};

export function NoteStats({
  slug,
  variant,
}: {
  slug: string;
  variant: "card" | "post";
}) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    const apply = (s: Stats) => alive && setStats(s);
    const viewedKey = `fn-viewed-${slug}`;

    (async () => {
      try {
        if (variant === "post" && !localStorage.getItem(viewedKey)) {
          const r = await fetch(`${API}/view`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ slug }),
          });
          localStorage.setItem(viewedKey, "1");
          apply(await r.json());
          // the beacon response lacks upstream; top it up
          const r2 = await fetch(`${API}/stats?slugs=${slug}`);
          apply((await r2.json())[slug]);
        } else {
          const r = await fetch(`${API}/stats?slugs=${slug}`);
          apply((await r.json())[slug]);
        }
      } catch {
        /* counters are garnish; never break the page over them */
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug, variant]);

  async function react(kind: "up" | "heart") {
    if (!stats) return;
    const on = !stats.you[kind];
    // optimistic
    setStats({
      ...stats,
      [kind]: stats[kind] + (on ? 1 : -1),
      you: { ...stats.you, [kind]: on },
    });
    try {
      const r = await fetch(`${API}/react`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, kind, on }),
      });
      const fresh: Stats = await r.json();
      setStats((cur) => ({ ...fresh, upstream: cur?.upstream ?? fresh.upstream }));
    } catch {
      /* leave the optimistic state; server reconciles next load */
    }
  }

  const chip = stats?.upstream ? CHIP[stats.upstream.state] : null;

  if (variant === "card") {
    return (
      <span className="note-stats" aria-hidden={stats ? undefined : true}>
        {chip && <span className={chip.cls}>{chip.label}</span>}
        {stats && (
          <>
            <span className="ns-n"><Icon d={EYE} /> {stats.views}</span>
            <span className="ns-n"><Icon d={UP} /> {stats.up}</span>
            <span className="ns-n"><Icon d={HEART} /> {stats.heart}</span>
          </>
        )}
      </span>
    );
  }

  const evidence = posts.find((p) => p.slug === slug)?.evidence;
  const up = stats?.upstream;
  const diff =
    up && up.additions !== undefined && up.deletions !== undefined
      ? `+${up.additions} \u2212${up.deletions}` +
        (up.files ? ` across ${up.files} file${up.files > 1 ? "s" : ""}` : "")
      : null;

  return (
    <div className="note-stats note-stats-post">
      {stats ? (
        <>
          <span className="ns-pill ns-static" title="unique readers">
            <Icon d={EYE} /> {stats.views} readers
          </span>
          <button
            type="button"
            className={`ns-pill ns-btn${stats.you.up ? " ns-on" : ""}`}
            aria-pressed={stats.you.up}
            onClick={() => react("up")}
            title="upvote"
          >
            <Icon d={UP} filled={stats.you.up} /> {stats.up}
          </button>
          <button
            type="button"
            className={`ns-pill ns-btn ns-heart${stats.you.heart ? " ns-on" : ""}`}
            aria-pressed={stats.you.heart}
            onClick={() => react("heart")}
            title="leave a heart"
          >
            <Icon d={HEART} filled={stats.you.heart} /> {stats.heart}
          </button>
          {chip && stats.upstream && (
            <a
              className={chip.cls}
              href={stats.upstream.url}
              target="_blank"
              rel="noreferrer"
            >
              {stats.upstream.repo && stats.upstream.number
                ? `${stats.upstream.repo}#${stats.upstream.number}`
                : "upstream"}{" "}
              &middot; {chip.label}
            </a>
          )}
        </>
      ) : (
        <span className="ns-n">&nbsp;</span>
      )}
      {(diff || evidence) && (
        <div className="ns-evidence">
          {diff && <span>{diff}</span>}
          {evidence && <span>{evidence}</span>}
        </div>
      )}
    </div>
  );
}
