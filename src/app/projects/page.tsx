import type { Metadata } from "next";
import Link from "next/link";
import type { Spec } from "@/lib/resume";
import { ProjectArt } from "./ProjectArt";
import { ORIGIN_LABEL, allSkills, demoOf, featuredSkills, projects, skillSlug, taglineOf } from "./projects-data";
import { SkillFilter } from "./SkillFilter";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Things I've built and how I test them: an LLM playlist app with an eval harness, a Japanese cooking game, a self-hosted RAG library and more.",
};

export default function ProjectsPage() {
  return (
    <main className="projects-index">
      <h1>Projects</h1>
      <p className="sub">
        Pick one to see it, play it, and read how it&apos;s tested. The ones
        marked <span className="live-chip">live</span> open in your browser,
        invite codes included.
      </p>

      <SkillFilter skills={allSkills} featured={featuredSkills} />

      <div className="project-grid" data-testid="project-grid">
        {projects.map((spec) => (
          <ProjectTile key={spec.id} spec={spec} />
        ))}
      </div>
    </main>
  );
}

function ProjectTile({ spec }: { spec: Spec }) {
  return (
    <Link
      href={`/projects/${spec.id}`}
      className="project-tile"
      data-testid="project-tile"
      data-spec={spec.id}
      data-skills={(spec.skills ?? []).map((k) => skillSlug(k.name)).join(" ")}
    >
      <ProjectArt spec={spec} sizes="(max-width: 640px) 100vw, 380px" />
      <div className="tile-body">
        <div className="tile-chips">
          {demoOf(spec) && <span className="live-chip">live</span>}
          {spec.origin && spec.origin !== "personal" && (
            <span className={`origin origin-${spec.origin}`}>{ORIGIN_LABEL[spec.origin]}</span>
          )}
        </div>
        <h2>
          {spec.title}
          {spec.titleNative && <span className="title-native" lang="ja"> ({spec.titleNative})</span>}
        </h2>
        <p>{spec.summary ?? taglineOf(spec)}</p>
        {spec.skills && (
          <ul className="tile-skills" aria-label="Skills">
            {spec.skills.map((k) => (
              <li key={k.name} className="has-tip">
                {k.name}
                <span className="tip" role="tooltip">
                  <b>
                    {k.name} · in {spec.title}
                  </b>
                  {k.note}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}
