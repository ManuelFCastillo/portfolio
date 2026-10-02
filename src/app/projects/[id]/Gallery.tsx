"use client";

import Image from "next/image";
import { useState } from "react";
import type { Screenshot } from "@/lib/resume";

/**
 * One large screenshot with thumbnails under it. The large one is the way in:
 * on a live project, clicking it opens the demo.
 */
export function Gallery({ shots, demo }: { shots: Screenshot[]; demo?: { href: string; label: string } }) {
  const [i, setI] = useState(0);
  const shot = shots[i];
  const hero = (
    <div className="hero-frame">
      <Image src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} sizes="(max-width: 860px) 100vw, 820px" priority />
      {demo && (
        <span className="hero-play" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5L8 5.5Z" /></svg>
          {demo.label}
        </span>
      )}
    </div>
  );

  return (
    <div className="gallery" data-testid="gallery">
      {demo ? (
        <a href={demo.href} target="_blank" rel="noopener noreferrer" className="hero" aria-label={`${demo.label} (opens in a new tab)`} data-testid="hero-demo">
          {hero}
        </a>
      ) : (
        <div className="hero">{hero}</div>
      )}
      <p className="hero-caption">{shot.caption}</p>
      {shots.length > 1 && (
        <div className="thumbs" role="tablist" aria-label="Screenshots">
          {shots.map((s, n) => (
            <button
              key={s.src}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={`Screenshot ${n + 1} of ${shots.length}`}
              className="thumb"
              onClick={() => setI(n)}
            >
              <Image src={s.src} alt="" width={160} height={Math.round((160 * s.height) / s.width)} sizes="160px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
