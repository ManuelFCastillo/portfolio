import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpecLinks } from "@/components/Report";
import { ORIGIN_LABEL, demoOf, projects, skillSlug, taglineOf } from "../projects-data";
import { ProjectArt } from "../ProjectArt";
import { Gallery } from "./Gallery";
import { PhoneShowcase } from "./PhoneShowcase";

export function generateStaticParams() {
  return projects.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const spec = projects.find((p) => p.id === id);
  return spec ? { title: spec.title, description: taglineOf(spec) } : {};
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const i = projects.findIndex((p) => p.id === id);
  if (i < 0) notFound();
  const spec = projects[i];
  const demo = demoOf(spec);
  const prev = projects[(i - 1 + projects.length) % projects.length];
  const next = projects[(i + 1) % projects.length];
  const hasGallery = Boolean(spec.screenshots?.length);
  const playable = demo ? { href: demo.href, label: demo.label } : undefined;
  // The phone showcase or the big screenshot is already this demo's play button, and the phone
  // showcase's panel takes any further demos too; the square buttons keep the rest (docs, requests).
  const extraDemos = spec.phone ? (spec.links ?? []).filter((l) => l.kind === "demo" && l !== demo) : [];
  const otherLinks = (spec.links ?? []).filter((l) => !((hasGallery || spec.phone) && l === demo) && !extraDemos.includes(l));

  return (
    <main className="project-detail" data-testid="project-detail" data-spec={spec.id}>
      <Link href="/projects" className="back">&larr; all projects</Link>

      <header>
        <div className="meta">
          {spec.period} · {spec.location}
          {spec.origin && spec.origin !== "personal" && (
            <span className={`origin origin-${spec.origin}`}>{ORIGIN_LABEL[spec.origin]}</span>
          )}
          {demo && <span className="live-chip">live</span>}
        </div>
        <h1>
          {spec.title}
          {spec.titleNative && <span className="title-native" lang="ja"> ({spec.titleNative})</span>}
        </h1>
        <p className="role">{taglineOf(spec)}</p>
        {spec.skills && (
          <ul className="detail-skills" aria-label="What it involved">
            {spec.skills.map((k) => (
              <li key={k.name} className="has-tip">
                <Link href={`/projects?skill=${skillSlug(k.name)}`} aria-description={k.note}>
                  {k.name}
                </Link>
                <span className="tip" aria-hidden>
                  <b>
                    {k.name} · in {spec.title}
                  </b>
                  {k.note}
                </span>
              </li>
            ))}
          </ul>
        )}
      </header>

      {spec.phone ? (
        <PhoneShowcase shots={spec.phone.screenshots} qr={spec.phone.qr} qrHint={spec.phone.qrHint} demo={playable} more={extraDemos.map((l) => ({ href: l.href, label: l.label, hint: l.hint }))} />
      ) : hasGallery ? (
        <Gallery shots={spec.screenshots!} demo={playable} />
      ) : spec.proprietary ? (
        <div className="proprietary" data-testid="proprietary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
            <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
          </svg>
          <div>
            <p className="proprietary-label">Proprietary · client work</p>
            <p>{spec.proprietary}</p>
          </div>
        </div>
      ) : (
        <ProjectArt spec={spec} sizes="(max-width: 860px) 100vw, 820px" />
      )}

      {otherLinks.length > 0 && <SpecLinks links={otherLinks} />}

      {spec.phone && hasGallery && (
        <section>
          <h2>On a wide screen</h2>
          <Gallery shots={spec.screenshots!} />
        </section>
      )}

      {spec.skills && (
        <section>
          <h2>What it involved</h2>
          <dl className="involved">
            {spec.skills.map((k) => (
              <div key={k.name}>
                <dt>
                  <Link href={`/projects?skill=${skillSlug(k.name)}`}>{k.name}</Link>
                </dt>
                <dd>{k.note}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section>
        <h2>About</h2>
        <p className="brief">{spec.brief}</p>
        <ul className="stack" aria-label="Stack">
          {spec.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>How it&apos;s tested <span className="count">{spec.tests.length} checks</span></h2>
        <ul className="checks">
          {spec.tests.map((t) => (
            <li key={t.id}>
              <details>
                <summary>
                  <span className={t.status === "passed" ? "ok" : "bad"} aria-hidden>
                    {t.status === "passed" ? "✓" : "✗"}
                  </span>
                  {t.title}
                </summary>
                {t.note && <p>{t.note}</p>}
              </details>
            </li>
          ))}
        </ul>
      </section>

      <nav className="pager" aria-label="More projects">
        <Link href={`/projects/${prev.id}`}>&larr; {prev.title}</Link>
        <Link href={`/projects/${next.id}`}>{next.title} &rarr;</Link>
      </nav>
    </main>
  );
}
