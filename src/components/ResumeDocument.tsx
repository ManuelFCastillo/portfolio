import {
  contact,
  credentials,
  profile,
  skillGroups,
  suites,
} from "@/lib/resume";

/**
 * The résumé as plain, semantic HTML — server-rendered.
 *
 * Three audiences read this and never see the runner:
 *   1. Search engines, which need real text in the initial response.
 *   2. Screen readers, which get a clean document before the app.
 *   3. Printers, where this becomes an actual one-page résumé.
 */
/**
 * Assertion titles are written lowercase for the runner ("owns an 800+ test
 * suite"). In a résumé they are bullets, so they get sentence-cased and
 * terminated — otherwise a spec without a note reads as a fragment.
 */
function asBullet(text: string): string {
  const s = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

export function ResumeDocument() {
  // Driven by the suites themselves, so a new suite can't silently land in
  // the wrong section the way an id blacklist allowed.
  const career = suites.find((s) => s.id === "career")?.specs ?? [];
  const projects = suites.find((s) => s.id === "projects")?.specs ?? [];

  return (
    <article
      aria-label="Résumé, plain text version"
      className="sr-only print:not-sr-only print:static print:m-0 print:h-auto print:w-auto print:overflow-visible print:p-0 print:text-[10.5pt] print:leading-snug print:text-black"
    >
      <header>
        <h1 className="print:text-[20pt] print:font-bold">{profile.name}</h1>
        <p className="print:text-[11pt] print:font-medium">{profile.title}</p>
        <p className="print:text-[9.5pt]">{profile.headline}</p>
        {/* No phone here: this block is server-rendered, so anything in it is
            in the raw HTTP response. <Phone /> handles it client-side. */}
        <address className="print:text-[9.5pt] print:not-italic">
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
          {" · "}
          <a href={contact.linkedinUrl}>{contact.linkedin}</a>
        </address>
      </header>

      <section>
        <h2 className="print:mt-3 print:text-[12pt] print:font-bold print:uppercase print:tracking-wide">
          Summary
        </h2>
        <p>{profile.summary}</p>
      </section>

      <section>
        <h2 className="print:mt-3 print:text-[12pt] print:font-bold print:uppercase print:tracking-wide">
          Skills
        </h2>
        <ul>
          {skillGroups.map((g) => (
            <li key={g.id}>
              <strong>{g.label}:</strong> {g.items.join(", ")}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="print:mt-3 print:text-[12pt] print:font-bold print:uppercase print:tracking-wide">
          Experience
        </h2>
        {career.map((spec) => (
          <div key={spec.id} className="print:mt-2">
            <h3 className="print:text-[11pt] print:font-semibold">
              {spec.role} — {spec.org}
            </h3>
            <p className="print:text-[9.5pt] print:italic">
              {spec.location} · {spec.period}
            </p>
            <ul className="print:ml-4 print:list-disc">
              {spec.tests.map((t) => (
                <li key={t.id}>{asBullet(t.note ?? t.title)}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section>
        <h2 className="print:mt-3 print:text-[12pt] print:font-bold print:uppercase print:tracking-wide">
          Projects
        </h2>
        {projects.map((spec) => (
          <div key={spec.id} className="print:mt-2">
            <h3 className="print:text-[11pt] print:font-semibold">{spec.role}</h3>
            <p className="print:text-[9.5pt] print:italic">
              {spec.org} · {spec.stack.join(", ")}
            </p>
            <ul className="print:ml-4 print:list-disc">
              {spec.tests.map((t) => (
                <li key={t.id}>{asBullet(t.note ?? t.title)}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section>
        <h2 className="print:mt-3 print:text-[12pt] print:font-bold print:uppercase print:tracking-wide">
          Education
        </h2>
        <ul>
          {credentials.map((c) => (
            <li key={c.degree}>
              {c.degree}, {c.institution}, {c.location} — {c.year}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
