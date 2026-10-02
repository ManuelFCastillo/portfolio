"use client";

import { useEffect, useState } from "react";

/**
 * Filters the gallery by skill. The tiles stay server-rendered; each carries
 * its skills as tokens in `data-skills`, and this hides the ones that don't
 * match. The choice lives in `?skill=` so a filtered view can be shared.
 */
type Skill = { name: string; slug: string; count: number; about: string };

export function SkillFilter({ skills, featured }: { skills: Skill[]; featured: Skill[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [hover, setHover] = useState<Skill | null>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("skill");
    if (fromUrl && skills.some((s) => s.slug === fromUrl)) {
      // The URL is only readable after mount, so this one-time sync has to happen here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(fromUrl);
      if (!featured.some((s) => s.slug === fromUrl)) setAll(true);
    }
  }, [skills, featured]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (active) url.searchParams.set("skill", active);
    else url.searchParams.delete("skill");
    window.history.replaceState(null, "", url);
  }, [active]);

  const shown = active ? skills.find((s) => s.slug === active) : null;

  return (
    <div className="skill-filter" data-testid="skill-filter">
      {/* Hiding is done in CSS so tiles never re-render, and the hover clips keep their state. */}
      {active && (
        <style>{`[data-testid="project-grid"] .project-tile:not([data-skills~="${active}"]) { display: none; }`}</style>
      )}
      <div className="skill-chips" role="group" aria-label="Filter projects by skill">
        {(all ? skills : featured).map((s) => (
          <button
            key={s.slug}
            type="button"
            aria-pressed={active === s.slug}
            className="skill-chip"
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(s)}
            onBlur={() => setHover(null)}
            onClick={() => setActive((a) => (a === s.slug ? null : s.slug))}
          >
            {s.name}
            {s.count > 1 && <span className="n">{s.count}</span>}
          </button>
        ))}
        <button type="button" className="skill-more" aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? "Fewer skills" : `All skills (${skills.length})`}
        </button>
      </div>
      <p className="skill-status" aria-live="polite">
        {hover?.about ? (
          <>
            <strong>{hover.name}</strong>: {hover.about}
          </>
        ) : shown ? (
          <>
            {shown.count} {shown.count === 1 ? "project" : "projects"} with <strong>{shown.name}</strong> ·{" "}
            <button type="button" className="skill-clear" onClick={() => setActive(null)}>
              show all
            </button>
          </>
        ) : (
          "Tap a skill to see the projects that used it. Hover a tag on a tile to see what it meant there."
        )}
      </p>
    </div>
  );
}
