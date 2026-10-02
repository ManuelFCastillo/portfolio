import { suites, type Spec } from "@/lib/resume";

/** The projects suite, in the order the résumé lists it: playable work first, internal tooling last. */
export const projects: Spec[] = suites.find((s) => s.id === "projects")?.specs ?? [];

export const demoOf = (spec: Spec) => spec.links?.find((l) => l.kind === "demo");

/** The role line without the title it repeats ("Cur8: playlists…" → "playlists…"). */
export const taglineOf = (spec: Spec) =>
  spec.role.replace(new RegExp(`^${spec.title}\\s*[:—-]\\s*`), "");

export const ORIGIN_LABEL: Record<NonNullable<Spec["origin"]>, string> = {
  internal: "Internal tool",
  contract: "Contract",
  personal: "Personal",
};

/** "Mobile (iOS)" → "mobile-ios": a token safe for URLs and `[data-skills~=…]`. */
export const skillSlug = (skill: string) =>
  skill.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** What each filter term means in general; a tile's chip says what it meant in that project. */
const GLOSSARY: Record<string, string> = {
  RAG: "Retrieval-augmented generation: grounding a model's answer in data fetched for the request.",
  "Vector Search": "Finding content by meaning, using nearest-neighbour search over embeddings.",
  "LLM Evaluation": "Measuring model output against expectations, run by run, instead of judging it by eye.",
  "Hallucination Metrics": "Counting how often a model states things that aren't true or don't exist.",
  "Golden Datasets": "Hand-checked inputs with known right answers that every run is scored against.",
  Guardrails: "Rules enforced in code around a model, so a bad output can't reach the user.",
  "E2E Automation": "Tests that drive the real app in a browser the way a person would.",
  "Smoke Testing": "Fast checks against a live deployment that the essentials still work.",
  "Mobile-first QA": "Designed and tested for a phone before a desktop.",
  "CI/CD": "Tests that run automatically on every push and gate what ships.",
  "Performance Profiling": "Measuring where time goes, then proving the fix with numbers.",
  "Content Moderation": "Screening what users submit before other people see it.",
};

/** Every skill in use, most-shared first, so the filter leads with what spans projects. */
export const allSkills = (() => {
  const counts = new Map<string, number>();
  for (const p of projects) for (const { name } of p.skills ?? []) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, slug: skillSlug(name), count, about: GLOSSARY[name] ?? "" }));
})();

/**
 * The filter's first row: the terms an AI/QA recruiter searches for. The rest
 * wait behind "All skills" so the bar never becomes a wall of chips.
 */
const FEATURED = [
  "RAG",
  "Vector Search",
  "LLM Evaluation",
  "Hallucination Metrics",
  "Golden Datasets",
  "Guardrails",
  "E2E Automation",
  "Smoke Testing",
  "Mobile-first QA",
  "CI/CD",
  "Performance Profiling",
  "Content Moderation",
];
export const featuredSkills = FEATURED.map((name) => allSkills.find((s) => s.name === name)).filter(
  (s): s is (typeof allSkills)[number] => Boolean(s),
);
