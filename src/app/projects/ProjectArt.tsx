import Image from "next/image";
import type { Spec } from "@/lib/resume";
import { CoverVideo } from "./CoverVideo";

/** The cover or first screenshot, or a title card for work there's no picture of (internal tools). */
export function ProjectArt({ spec, sizes }: { spec: Spec; sizes: string }) {
  const shot = spec.screenshots?.[0];
  const src = spec.cover ?? shot?.src;
  if (src) {
    return (
      <div className={`project-art${spec.coverFit === "contain" ? " project-art-contain" : ""}`}>
        {spec.coverVideo ? (
          <CoverVideo src={spec.coverVideo} poster={src} alt={shot?.alt ?? spec.title} />
        ) : (
          <Image src={src} alt={shot?.alt ?? ""} fill sizes={sizes} />
        )}
      </div>
    );
  }
  // No picture to show. Internal and client work say why (it's confidential);
  // personal work just hasn't been photographed yet.
  const confidential = spec.origin === "internal" || spec.origin === "contract" || Boolean(spec.proprietary);
  const stamp = confidential ? "Confidential" : "Screenshots soon";
  const note = spec.origin === "internal" ? spec.org : spec.origin === "contract" ? "Client work" : spec.location;
  return (
    <div
      className={`project-art project-art-blank origin-${spec.origin ?? "personal"}${confidential ? " is-confidential" : ""}`}
      aria-hidden
    >
      <div className="wire">
        <div className="wire-bar">
          <i />
          <i />
          <i />
        </div>
        <div className="wire-body">
          <span className="w-line w-60" />
          <span className="w-line w-85 redact" />
          <span className="w-line w-40" />
          <span className="w-block" />
          <span className="w-line w-70 redact" />
          <span className="w-line w-50" />
        </div>
      </div>
      <span className="blank-stamp">
        {stamp}
        <small>{note}</small>
      </span>
      <span className="blank-stack">{spec.stack.slice(0, 3).join(" · ")}</span>
    </div>
  );
}
