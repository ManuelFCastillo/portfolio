"use client";

import Image from "next/image";
import { useState } from "react";
import type { Screenshot } from "@/lib/resume";

/**
 * A phone-first project, shown the way it's played: screens in a phone frame,
 * and next to it two ways to play at phone size. An embedded iframe isn't one
 * of them: invite passes are SameSite=Lax cookies, which browsers drop inside a
 * cross-site frame, and YouTube and Google sign-in balk at being framed. A popup
 * window is a first-party visit, so invite links work there.
 */
export function PhoneShowcase({
  shots,
  qr,
  qrHint,
  demo,
  more = [],
}: {
  shots: Screenshot[];
  qr?: string;
  /** One line under the QR code: what to try once it's open on a phone. */
  qrHint?: string;
  demo?: { href: string; label: string };
  /** Other ways in, as plain links under the play button. */
  more?: { href: string; label: string; hint: string }[];
}) {
  const [i, setI] = useState(0);
  const shot = shots[i];
  const go = (d: number) => setI((n) => (n + d + shots.length) % shots.length);

  function openPhoneWindow(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!demo || window.matchMedia("(max-width: 640px)").matches) return; // on a phone, just open it
    const w = 390;
    const h = 844;
    const left = Math.max(0, window.screenX + window.outerWidth - w - 80);
    const top = Math.max(0, window.screenY + 60);
    // Named per site, so two projects' popups don't reuse each other's window.
    const win = window.open(demo.href, `phone-${new URL(demo.href).hostname}`, `popup,width=${w},height=${h},left=${left},top=${top}`);
    if (win) e.preventDefault(); // popup blocked: fall through to a normal new tab
  }

  return (
    <div className="phone-showcase" data-testid="phone-showcase">
      <div className="phone-stage">
        <button type="button" className="phone-nav prev" onClick={() => go(-1)} aria-label="Previous screen">
          &lsaquo;
        </button>
        {/* A wider-than-tall screen is the phone held sideways: the frame turns with it. */}
        <div className={`phone-frame${shot.width > shot.height ? " landscape" : ""}`}>
          <div className="phone-screen" style={{ aspectRatio: `${shot.width} / ${shot.height}` }}>
            {shot.video ? (
              <video
                key={shot.video}
                src={shot.video}
                poster={shot.src}
                aria-label={shot.alt}
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <Image src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} sizes="(max-width: 640px) 70vw, 440px" priority={i === 0} />
            )}
          </div>
        </div>
        <button type="button" className="phone-nav next" onClick={() => go(1)} aria-label="Next screen">
          &rsaquo;
        </button>
        <div className="phone-dots" role="tablist" aria-label="Screens">
          {shots.map((s, n) => (
            <button
              key={s.src}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={`Screen ${n + 1} of ${shots.length}`}
              onClick={() => setI(n)}
            />
          ))}
        </div>
        <p className="phone-caption" aria-live="polite">{shot.caption}</p>
      </div>

      {demo && (
        <aside className="play-panel" aria-label="Play it">
          <h2>Play it</h2>
          <a
            href={demo.href}
            target="_blank"
            rel="noopener noreferrer"
            className="play-button"
            data-testid="play-phone-window"
            onClick={openPhoneWindow}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5.5v13l10.5-6.5L8 5.5Z" />
            </svg>
            <span>
              <span className="desk-only">Play in a phone-size window</span>
              <span className="phone-only">{demo.label}</span>
            </span>
          </a>
          <p className="play-note desk-only">Opens the real thing at 390&times;844, no sign-up.</p>
          {more.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="play-more">
              {l.label} &rarr; <span>{l.hint}</span>
            </a>
          ))}

          {qr && (
            <div className="play-qr desk-only">
              {/* eslint-disable-next-line @next/next/no-img-element -- a tiny static SVG, nothing to optimise */}
              <img src={qr} alt={`QR code that opens ${demo.label.toLowerCase()} on your phone`} width={132} height={132} />
              <p>
                <strong>Better on a real phone.</strong> {qrHint ?? "Scan to play it there."}
              </p>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
