import type { ProjectCi } from "./ci";

/**
 * The résumé, modeled as a test suite.
 *
 * This is the single source of truth for the entire site. The CLI and the HTML
 * report are two renderers over this same tree — nothing is duplicated between
 * them. To update the résumé, edit this file; both surfaces follow.
 */

export type TestStatus = "passed" | "failed" | "running" | "pending";

/** A single assertion — one résumé bullet. */
export interface Test {
  id: string;
  /** Written as an assertion, present tense, the way a spec title reads. */
  title: string;
  /** Simulated execution time in ms. Tuned to feel like a real suite. */
  duration: number;
  status: "passed" | "failed";
  /** Expanded body shown when the test is opened in the report. */
  note?: string;
  /** Technologies exercised by this assertion. */
  tags?: string[];
  /** Rendered as a Playwright-style failure block. Only for failing tests. */
  failure?: TestFailure;
}

export interface TestFailure {
  matcher: string;
  expected: string;
  received: string;
  codeFrame: CodeFrameLine[];
  location: string;
  /** Contact links, rendered in the position of a stack trace. */
  trace: TraceLink[];
}

export interface CodeFrameLine {
  n: number;
  text: string;
  /** Marks the `>` gutter line and draws the caret underneath. */
  highlight?: boolean;
  /** Column for the caret marker. */
  caret?: number;
}

export interface TraceLink {
  label: string;
  href: string;
}

/** A spec file — one role. */
export interface Spec {
  id: string;
  /** Path as it appears in runner output. */
  file: string;
  title: string;
  role: string;
  org: string;
  location: string;
  period: string;
  /** Case-study prose shown in the trace viewer. */
  brief: string;
  stack: string[];
  tests: Test[];
  /** Roles render as employment; projects render as built work. */
  kind?: "role" | "project";
  /**
   * Projects only. Internal work is flagged because a reader cannot click
   * through to it — it lives behind a former employer's login. Personal work
   * is the default and needs no badge.
   */
  origin?: "internal" | "personal" | "contract";
  /** Evidence, for projects a reader cannot otherwise see running. */
  screenshots?: Screenshot[];
  /**
   * Projects that run their own suite in their own repo. The badge beside the
   * period then reflects that repo's latest run, not this site's.
   */
  ci?: ProjectCi;
}

export interface Screenshot {
  src: string;
  width: number;
  height: number;
  /** Read aloud by screen readers, so it describes the substance. */
  alt: string;
  /** Shown beneath the image — say what is worth noticing. */
  caption: string;
}

export interface Suite {
  id: string;
  title: string;
  specs: Spec[];
}

export interface Profile {
  name: string;
  fullName: string;
  title: string;
  headline: string;
  summary: string;
  yearsExperience: number;
}

export interface Contact {
  // No `email` here either — it lives obfuscated in `src/lib/email.ts` and is
  // rendered by <Email />, which decodes on mount. LinkedIn stays in the clear:
  // it is a URL, not something a harvester can mail.
  linkedin: string;
  linkedinUrl: string;
  // No `phone` here on purpose. It lives obfuscated in `src/lib/phone.ts` and
  // is rendered by <Phone />, so it never reaches this repo, the server HTML,
  // or the DOM at rest. See that file for the reasoning.
}

export interface SkillGroup {
  id: string;
  /** Rendered as a filename in the coverage table. */
  file: string;
  label: string;
  items: string[];
  /** Proficiency, rendered as coverage percentages. */
  coverage: { stmts: number; branch: number; funcs: number; lines: number };
}

export interface Credential {
  degree: string;
  institution: string;
  location: string;
  year: string;
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

/**
 * Summed from the career periods below rather than hardcoded, so it can't go
 * stale the way "13+ years" did when the Sorcero end date moved to 2026.
 * Sums actual tenure (14) rather than the 2011-2026 span (15) — the gap
 * between EMC and Symantec is real and shouldn't be counted.
 */
function yearsOfExperience(periods: string[]): number {
  return periods.reduce((total, period) => {
    const [start, end] = period.split(/\s*[\u2014-]\s*/).map((p) => parseInt(p, 10));
    if (!Number.isFinite(start) || !Number.isFinite(end)) return total;
    return total + Math.max(0, end - start);
  }, 0);
}

const CAREER_PERIODS = ["2020 \u2014 2026", "2015 \u2014 2020", "2014 \u2014 2015", "2011 \u2014 2013"];
export const YEARS_EXPERIENCE = yearsOfExperience(CAREER_PERIODS);

export const profile: Profile = {
  name: "Manny Castillo",
  fullName: "Manuel Castillo",
  title: "Senior Software Engineer in Test",
  headline:
    "Backend & API Test Automation · Data Pipelines · Python · Distributed Systems · CI/CD",
  summary:
    `Senior SDET with ${YEARS_EXPERIENCE}+ years testing backend services, data pipelines, and large-scale distributed systems. API and integration automation in Python, Airflow pipeline validation with nightly runs, and performance work against the services underneath — plus the web and mobile E2E layer on top of it in Playwright and Maestro. Builds the test frameworks and internal tooling other engineers depend on, across enterprise SaaS, gaming infrastructure, storage, and cybersecurity.`,
  yearsExperience: YEARS_EXPERIENCE,
};

/**
 * Generated from this site's own print view by scripts/resume-pdf.mjs, so it
 * stays in sync with the data below and — unlike the hand-maintained PDF —
 * carries no phone number for crawlers to extract.
 */
export const RESUME_PDF = "/manny-castillo-resume.pdf";

export const contact: Contact = {
  linkedin: "linkedin.com/in/manuelfcastillo",
  linkedinUrl: "https://linkedin.com/in/manuelfcastillo",
};

/* ------------------------------------------------------------------ */
/* Career specs                                                        */
/* ------------------------------------------------------------------ */

const sorcero: Spec = {
  id: "sorcero",
  file: "career/sorcero.spec.ts",
  title: "Sorcero Inc.",
  role: "Lead SDET, Medical Team — Backend, Pipeline & UI Automation",
  org: "Sorcero Inc.",
  location: "Remote",
  period: "2020 — 2026",
  brief:
    "Lead SDET for the Medical Team on Sorcero's flagship product, owning test strategy and automation across the stack. Most of the weight sat behind the UI: API and integration coverage over the microservices, Airflow pipeline validation in Google Cloud Composer with nightly runs, ML and LLM output validation for the MLOps team, and distributed execution on Kubernetes. Also led the CI/CD tooling migration from GitHub Actions to GitLab CI, and owned the web and mobile E2E layer on top in Playwright and Maestro.",
  stack: [
    "Python",
    "pytest",
    "Airflow",
    "Google Cloud Composer",
    "Kubernetes",
    "GitLab CI",
    "GitHub Actions",
    "Jenkins",
    "JMeter",
    "Locust",
    "Grafana",
    "TypeScript",
    "Playwright",
    "Maestro",
    "iOS",
  ],
  tests: [
    {
      id: "sorcero-lead",
      title: "Lead SDET for the Medical Team on the flagship product",
      duration: 2410,
      status: "passed",
      note: "Owned test strategy and end-to-end automation for the Medical Team, and mentored engineers across teams.",
      tags: ["Leadership", "Test Strategy", "Mentoring"],
    },
    {
      id: "sorcero-api",
      title: "API and integration tests cover the services behind the product",
      duration: 2688,
      status: "passed",
      note: "Automation reaching past the browser into the REST and GraphQL services, so failures are attributed to the layer that actually broke.",
      tags: ["API Testing", "REST", "GraphQL", "Microservices"],
    },
    {
      id: "sorcero-airflow",
      title: "Airflow DAG tests validate data pipelines end to end",
      duration: 3104,
      status: "passed",
      note: "Tests asserting that Airflow DAGs running in Google Cloud Composer transform and land the data the product depends on — not just that the pipeline ran, but that what came out the other side was correct.",
      tags: ["Airflow", "Google Cloud Composer", "Data Validation"],
    },
    {
      id: "sorcero-nightly",
      title: "nightly pipeline runs surface data regressions before users do",
      duration: 3688,
      status: "passed",
      note: "Scheduled nightly validation against the data pipelines, so breakages introduced during the day are caught overnight and triaged in the morning instead of being discovered in the product.",
      tags: ["Nightly", "Data Validation"],
    },
    {
      id: "sorcero-mlops",
      title: "ML and LLM output validation owned for the MLOps team",
      duration: 3927,
      status: "passed",
      note: "Owned validation of model and LLM outputs for the MLOps team — non-deterministic results need a different testing approach than an assert on a fixed value. Also integrated LLM-assisted tooling into day-to-day test engineering.",
      tags: ["ML/LLM Validation", "MLOps", "Non-deterministic Testing"],
    },
    {
      id: "sorcero-k8s",
      title: "distributed test execution runs across Kubernetes",
      duration: 2955,
      status: "passed",
      note: "Moved suite execution onto Kubernetes so runs scale horizontally instead of serialising on one machine.",
      tags: ["Kubernetes", "Distributed Execution"],
    },
    {
      id: "sorcero-cicd",
      title: "CI/CD tooling migrated from GitHub Actions to GitLab CI",
      duration: 3142,
      status: "passed",
      note: "Led the migration to GitLab CI with secure workflows, and wired the suites to execute as part of deployment — on a dedicated dev/QA environment during development, then again on each promotion to staging and to production. The suites gated those promotions in practice: a release waited on a clean run, enforced as a process step rather than as an automated block in the pipeline.",
      tags: ["GitLab CI", "GitHub Actions", "Jenkins", "CI/CD"],
    },
    {
      id: "sorcero-perf",
      title: "Python performance tooling surfaces system bottlenecks",
      duration: 2213,
      status: "passed",
      note: "JMeter and Locust tooling in Python identifying front-end and back-end bottlenecks, feeding directly into optimization work.",
      tags: ["JMeter", "Locust", "Python", "Reliability"],
    },
    {
      id: "sorcero-grafana",
      title: "Grafana dashboards and automated failure triage cut investigation time",
      duration: 1804,
      status: "passed",
      note: "Dashboards plus automated triage workflows, so a red run arrives with a first guess at why rather than a wall of logs.",
      tags: ["Grafana", "Observability", "Failure Triage"],
    },
    {
      id: "sorcero-suite",
      title: "800+ test Playwright suite covers two major platforms",
      duration: 2847,
      status: "passed",
      note: "End-to-end and UI smoke coverage in TypeScript across two major customer-facing platforms, built alongside the QA team rather than in isolation, replacing a manual regression pass that consumed hours every release cycle.",
      tags: ["Playwright", "TypeScript", "E2E"],
    },
    {
      id: "sorcero-mobile",
      title: "iOS mobile app covered by Maestro end-to-end flows",
      duration: 2611,
      status: "passed",
      note: "Extended automated coverage to the native mobile app, writing E2E flows for iOS in Maestro so mobile regressions surface in the same cycle as web.",
      tags: ["Maestro", "iOS", "Mobile E2E"],
    },
    {
      id: "sorcero-smoke",
      title: "smoke suite validates core platform functionality on every release",
      duration: 1932,
      status: "passed",
      note: "The full smoke suite runs against core platform functionality on each release, covering the paths a user hits first.",
      tags: ["Smoke", "Regression"],
    },
  ],
};

const playstation: Spec = {
  id: "playstation",
  file: "career/playstation.spec.ts",
  title: "Sony PlayStation",
  role: "Software Engineer in Test",
  org: "Sony PlayStation",
  location: "Austin, TX",
  period: "2015 — 2020",
  brief:
    "Five years on the test infrastructure other teams ran on. Wrote pytest-based tests and test infrastructure in Daruma — Sony's in-house Python framework — covering microservices across the PlayStation Now service platform, including datacenter streaming validation. Built AWS automation to stand up and validate game streams against new European datacenters ahead of launch.",
  stack: [
    "Python",
    "pytest",
    "Daruma",
    "AWS",
    "boto3",
    "Go",
    "Prometheus",
    "Microservices",
    "Distributed Systems",
  ],
  tests: [
    {
      id: "ps-daruma",
      title: "Daruma, Sony's in-house Python test framework, supports teams across QA and SRE",
      duration: 2456,
      status: "passed",
      note: "Built and enhanced Daruma with reusable helper libraries and AWS tooling; it became shared infrastructure for automated testing beyond the immediate team.",
      tags: ["Python", "Daruma", "Frameworks"],
    },
    {
      id: "ps-microservices",
      title: "pytest suites cover microservices across the PlayStation Now platform",
      duration: 3218,
      status: "passed",
      note: "Wrote pytest-based tests and the test infrastructure around them for microservices spanning the PlayStation Now service platform, including datacenter streaming validation.",
      tags: ["pytest", "Microservices", "Streaming"],
    },
    {
      id: "ps-boto3",
      title: "AWS automation spins up and validates game streams in new datacenters",
      duration: 3760,
      status: "passed",
      note: "boto3 automation to provision and validate live game streams against new European datacenters ahead of launch.",
      tags: ["AWS", "boto3", "EC2", "Automation"],
    },
    {
      id: "ps-migration",
      title: "European launch validated ahead of 700,000+ concurrent users",
      duration: 4021,
      status: "passed",
      note: "Led QA initiatives supporting SRE through large-scale datacenter migration testing for the expansion of PlayStation Now infrastructure, validating capacity ahead of launch to 700,000+ concurrent users.",
      tags: ["SRE", "Scale", "Migration"],
    },
    {
      id: "ps-dashboard",
      title: "dashboard test runner executes and reports on automated suites",
      duration: 3390,
      status: "passed",
      note: "Designed the backend architecture for an in-house dashboard test runner — the system QA teams used to launch suites and read results.",
      tags: ["Python", "Architecture", "Backend"],
    },
    {
      id: "ps-prometheus",
      title: "Prometheus exporters in Go surface reliability metrics",
      duration: 1668,
      status: "passed",
      note: "Extended Prometheus exporters in Go so that quality and reliability signals were measurable rather than anecdotal.",
      tags: ["Go", "Prometheus", "Grafana"],
    },
  ],
};

const symantec: Spec = {
  id: "symantec",
  file: "career/symantec.spec.ts",
  title: "Symantec",
  role: "Software QA Engineer (Infrastructure Validation)",
  org: "Symantec",
  location: "Boston, MA",
  period: "2014 — 2015",
  brief:
    "Validation for enterprise cybersecurity products — test plans, Python automation, and the virtualized infrastructure the Security Virtual Appliance was tested on.",
  stack: ["Python", "VMware ESXi", "Security", "i18n"],
  tests: [
    {
      id: "sym-plans",
      title: "test plans and Python automation cover enterprise security products",
      duration: 1741,
      status: "passed",
      tags: ["Python", "Test Strategy"],
    },
    {
      id: "sym-esxi",
      title: "VMware on ESXi hosts Security Virtual Appliance test environments",
      duration: 2290,
      status: "passed",
      note: "Configured and managed the virtualization layer the appliance testing depended on.",
      tags: ["VMware", "ESXi"],
    },
    {
      id: "sym-vulns",
      title: "security vulnerabilities identified and mitigated",
      duration: 3115,
      status: "passed",
      note: "Found and helped close vulnerabilities, improving product resilience.",
      tags: ["Security"],
    },
    {
      id: "sym-i18n",
      title: "localization testing passes across supported locales",
      duration: 934,
      status: "passed",
      tags: ["i18n"],
    },
  ],
};

const emc: Spec = {
  id: "emc",
  file: "career/emc.spec.ts",
  title: "EMC",
  role: "Software Engineer",
  org: "EMC",
  location: "Hopkinton, MA",
  period: "2011 — 2013",
  brief:
    "Where the automation habit started, and the only role on this list where the system under test was physical: enterprise storage hardware validated in the lab with Python automation, down to thermal dwell testing on the enclosures themselves.",
  stack: [
    "Python",
    "Jenkins",
    "Linux",
    "Enterprise Storage",
    "Hardware Validation",
  ],
  tests: [
    {
      id: "emc-hardware",
      title: "SLICs, DAEs, DPEs and storage processors validated with Python automation",
      duration: 2603,
      status: "passed",
      note: "Hardware validation and regression testing across SLICs (I/O modules), DAEs (disk array enclosures), DPEs (disk processor enclosures) and storage processors, driven by Python automation frameworks.",
      tags: ["Storage", "Hardware Validation", "Python"],
    },
    {
      id: "emc-dwell",
      title: "cold and hot dwell environmental testing passes",
      duration: 3480,
      status: "passed",
      note: "Environmental and thermal dwell testing on enterprise storage enclosures — validating hardware behaviour across temperature extremes, not just software behaviour.",
      tags: ["Environmental Testing", "Thermal"],
    },
    {
      id: "emc-jenkins",
      title: "Jenkins extended with custom Python plugins",
      duration: 1109,
      status: "passed",
      note: "Modified Jenkins plugins in Python to make the build system support the validation workflows the lab needed.",
      tags: ["Jenkins", "Python"],
    },
    {
      id: "emc-linux",
      title: "Linux builds managed and reproducible",
      duration: 771,
      status: "passed",
      tags: ["Linux"],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Projects — internal tooling first, then personal work               */
/* ------------------------------------------------------------------ */

const sorceror: Spec = {
  id: "sorceror",
  file: "projects/sorceror.spec.ts",
  title: "Sorceror",
  kind: "project",
  origin: "internal",
  role: "Sorceror — Chrome extension for regression testing",
  org: "Internal tool · Sorcero",
  location: "Used daily by quality engineers",
  period: "Built in-house",
  brief:
    "Regression testing was slower than it needed to be for reasons that had nothing to do with testing: fetching an auth token by hand, and a product UI that hid the very numbers you needed to judge whether a test project was set up correctly. Sorceror put both a click away — an overlay on the product page itself, backed by a cache so it stayed instant, working against whichever environment you happened to be in.",
  stack: [
    "Chrome Extension",
    "JavaScript",
    "REST",
    "Caching",
    "Internal Tooling",
  ],
  tests: [
    {
      id: "sorceror-token",
      title: "auth token copied to the clipboard in one click",
      duration: 288,
      status: "passed",
      note: "Removed the manual token-fetching step that every quality engineer paid on every session.",
      tags: ["Auth", "DX"],
    },
    {
      id: "sorceror-overlay",
      title: "overlay surfaces project internals the product UI never showed",
      duration: 1466,
      status: "passed",
      note: "Injected an overlay onto the product page exposing what testers actually needed to see — record and article counts, stakeholder counts — none of which the product surfaced on its own.",
      tags: ["Overlay", "DOM"],
    },
    {
      id: "sorceror-ontology",
      title: "ontology information shown directly on projects",
      duration: 1211,
      status: "passed",
      note: "Surfaced the ontology backing a project alongside it, so testers could see the structure their test data was shaped by.",
      tags: ["Ontology", "Data"],
    },
    {
      id: "sorceror-manage",
      title: "test projects sorted and managed without leaving the product",
      duration: 1878,
      status: "passed",
      note: "Sorting, management and basic CRUD over the test projects themselves — the setup work happened in the same place as the testing.",
      tags: ["CRUD", "Workflow"],
    },
    {
      id: "sorceror-envs",
      title: "works across every environment",
      duration: 942,
      status: "passed",
      note: "Environment-aware, so the same extension served dev, QA, staging and production without reconfiguration.",
      tags: ["Multi-environment"],
    },
    {
      id: "sorceror-cache",
      title: "cached responses keep the overlay instant",
      duration: 523,
      status: "passed",
      note: "Caching kept the overlay fast enough that using it never cost more time than it saved.",
      tags: ["Caching", "Performance"],
    },
  ],
};

const tesseract: Spec = {
  id: "tesseract",
  file: "projects/tesseract.spec.ts",
  title: "Sorcero: Tesseract",
  kind: "project",
  origin: "internal",
  role: "Tesseract — a visual Playwright runner for disaster recovery",
  org: "Internal tool · Sorcero",
  location: "Used for disaster-recovery testing",
  period: "Built in-house",
  brief:
    "A terminal is a poor instrument for reasoning about which of many microservices is covered, healthy, and under test — especially mid disaster-recovery drill, across two regions, under time pressure. Tesseract made the system spatial: a live map of active microservices, each wired to the specs in the Playwright repo that cover it, so runs were orchestrated by pointing at the architecture instead of remembering spec paths. Every run's output was retained, which turned DR drills into a comparable history rather than a one-off.",
  stack: [
    "Three.js",
    "D3.js",
    "Playwright",
    "TypeScript",
    "Microservices",
    "Disaster Recovery",
  ],
  tests: [
    {
      id: "tesseract-map",
      title: "active microservices rendered as a live visual map",
      duration: 3344,
      status: "passed",
      note: "Built with Three.js and D3.js so the running system could be seen rather than inferred from logs.",
      tags: ["Three.js", "D3.js", "Visualization"],
    },
    {
      id: "tesseract-mapping",
      title: "each service maps to the specs that cover it",
      duration: 2087,
      status: "passed",
      note: "Bound the visual topology to the actual Playwright repo, so coverage of a given service was a thing you could look at.",
      tags: ["Playwright", "Orchestration"],
    },
    {
      id: "tesseract-orchestration",
      title: "runs orchestrated from the map instead of the command line",
      duration: 1755,
      status: "passed",
      note: "Selecting services selected their specs — orchestration by architecture rather than by remembered file paths.",
      tags: ["Orchestration", "DX"],
    },
    {
      id: "tesseract-dr",
      title: "disaster recovery compared side by side across regions",
      duration: 4206,
      status: "passed",
      note: "During DR exercises, two regions could be run and read against each other directly, which is the question a DR drill is actually asking.",
      tags: ["Disaster Recovery", "Multi-region"],
    },
    {
      id: "tesseract-history",
      title: "run history retained from each run's output",
      duration: 1592,
      status: "passed",
      note: "Persisted the output of each run so drills accumulated into a record that could be compared over time.",
      tags: ["History", "Reporting"],
    },
  ],
};

const askTheLibrary: Spec = {
  id: "ask-the-library",
  file: "projects/ask-the-library.spec.ts",
  title: "Ask the Library",
  kind: "project",
  role: "Ask the Library — self-hosted AI reading platform over 50,000 books",
  org: "Personal project",
  location: "Two-node home lab",
  period: "In progress",
  ci: {
    repo: "ManuelFCastillo/ask-the-library",
    slug: "ask-the-library",
    label: "API unit tests, deterministic e2e suite, and an undefined-reference gate",
  },
  brief:
    "A self-hosted RAG platform over a 50,700-book Project Gutenberg mirror — 7.5M passages, FastAPI backend, Elasticsearch kNN vector search on local embeddings, and streaming citation-grounded answers from self-hosted LLMs across a two-node home lab. Zero cloud APIs. Two React front-ends ship against the one API, an agentic ingestion pipeline gates what gets in, and a Stable Diffusion pipeline restores unusable cover scans. The testing on it is layered the way production systems need: a deterministic offline suite for speed, and a live smoke suite against real infrastructure that has already caught degradation before users did.",
  stack: [
    "Python",
    "FastAPI",
    "Elasticsearch",
    "kNN Vector Search",
    "RAG",
    "Ollama",
    "React",
    "TypeScript",
    "Playwright",
    "Docker",
    "Stable Diffusion",
  ],
  screenshots: [
    {
      src: "/shots/ask-the-library-reader.png",
      width: 1600,
      height: 890,
      alt: "The Ask the Library reader showing King Lear from Project Gutenberg in sepia, with a VocabLens panel on the left defining archaic words and a StudyBuddy panel on the right giving chapter-grounded commentary.",
      caption:
        "The reader on King Lear. VocabLens (left) picks archaic words out of the text and gives each one a plain-English gloss, its sense in this passage, IPA and etymology — “valewes → values, prefers”, “round → pregnant, full-term”. StudyBuddy (right) answers against the chapter you are actually on rather than the whole book.",
    },
  ],
  tests: [
    {
      id: "atl-deterministic",
      title: "deterministic Playwright suite runs offline in under five seconds",
      duration: 4812,
      status: "passed",
      note: "Eleven specs covering browse → search → detail → reader, made deterministic by intercepting at the network layer and serving fixtures. No infrastructure required, so it never flakes on a cold GPU or a slow index.",
      tags: ["Playwright", "Network Mocking", "Determinism"],
    },
    {
      id: "atl-smoke",
      title: "live smoke suite catches production degradation before users do",
      duration: 3944,
      status: "passed",
      note: "A second layer pointed at real infrastructure — vector search, LLM generation, the media pipeline — with environment-switchable targets for post-deploy verification. It caught GPU contention starving the search embeddings, which the offline suite by design could not.",
      tags: ["Smoke Testing", "Post-deploy", "Observability"],
    },
    {
      id: "atl-corpus",
      title: "50,700 books and 7.5M passages indexed for vector search",
      duration: 4402,
      status: "passed",
      note: "Elasticsearch kNN over locally-computed embeddings — the retrieval layer the answers are grounded in.",
      tags: ["Elasticsearch", "Embeddings", "Scale"],
    },
    {
      id: "atl-rag",
      title: "answers stream from self-hosted models with citations, and no cloud API",
      duration: 3620,
      status: "passed",
      note: "Streaming, citation-grounded Q&A served by Ollama across 14B/3B/1B tiers on a two-node home lab. Nothing is sent to a third-party API.",
      tags: ["RAG", "Ollama", "Self-hosted", "Citations"],
    },
    {
      id: "atl-latency",
      title: "kNN cold-cache latency cut from 17s to 0.2s",
      duration: 1740,
      status: "passed",
      note: "One of several infrastructure faults diagnosed end to end, alongside a CUDA/cuDNN conflict silently breaking GPU inference and request starvation from single-GPU contention.",
      tags: ["Performance", "Root Cause Analysis", "CUDA"],
    },
    {
      id: "atl-ingestion",
      title: "ingestion agent gates new books behind three quality checks",
      duration: 3288,
      status: "passed",
      note: "Public-domain acquisition from the Internet Archive filtered by OCR word-ratio heuristics, perceptual-hash detection of scanner boilerplate, and an LLM sniff test — with on-demand AI cleanup of the OCR text that survives.",
      tags: ["Agents", "Data Quality", "OCR"],
    },
    {
      id: "atl-covers",
      title: "unusable cover scans are detected and regenerated",
      duration: 4126,
      status: "passed",
      note: "Covers scored by Laplacian variance and a vision model, then regenerated through Stable Diffusion on a local GPU — with a before/after debug page that recomputes the scores client-side so every automated keep-or-replace decision can be audited. It exposed two classifier blind spots that became fixes.",
      tags: ["Computer Vision", "Stable Diffusion", "Auditability"],
    },
    {
      id: "atl-frontends",
      title: "two React front-ends ship against one API",
      duration: 2870,
      status: "passed",
      note: "A study-focused reader with themes, a two-page spread, a chapter-grounded chat panel and a vocabulary builder; plus a discovery UI with semantic search, token auth and saved lists.",
      tags: ["React", "TypeScript", "Frontend"],
    },
  ],
};

const fare: Spec = {
  id: "fare",
  file: "projects/fare.spec.ts",
  title: "Fare",
  kind: "project",
  role: "Fare — a rideshare platform whose economics are actually fair",
  org: "Fare Technologies",
  location: "Contract, via SLVRLeaf",
  period: "In development",
  origin: "contract",
  brief:
    "Contract work for Fare Technologies, taken on through SLVRLeaf: a rideshare platform built on the premise that the split between driver and platform should be defensible. Native iOS in Swift for the driver side, a web dispatch dashboard, and a TypeScript middleware layer over Firebase coordinating the two. Still in development — the honest status, not a shipped product.",
  stack: [
    "Swift",
    "iOS",
    "TypeScript",
    "Firebase",
    "Vercel",
    "Dispatch",
  ],
  tests: [
    {
      id: "fare-ios",
      title: "native iOS driver app built in Swift",
      duration: 3268,
      status: "passed",
      tags: ["Swift", "iOS"],
    },
    {
      id: "fare-dispatch",
      title: "web dispatch dashboard coordinates drivers",
      duration: 2740,
      status: "passed",
      note: "A dispatcher-facing web app alongside the driver app, so rides can be assigned and tracked from a desk.",
      tags: ["Dispatch", "Web"],
    },
    {
      id: "fare-middleware",
      title: "TypeScript middleware sits between the apps and Firebase",
      duration: 2196,
      status: "passed",
      note: "A middleware service in TypeScript rather than letting clients talk to Firebase directly — the seam where pricing and dispatch rules live.",
      tags: ["TypeScript", "Firebase", "Backend"],
    },
    {
      id: "fare-status",
      title: "delivered as contract work, still in development",
      duration: 612,
      status: "passed",
      note: "Engaged through SLVRLeaf rather than built as a side project — a real client with a real deadline. Listed as in-progress on purpose: it is a live build, not a shipped product.",
      tags: ["Contract", "SLVRLeaf", "In Progress"],
    },
  ],
};

const tiengviet: Spec = {
  id: "tiengviet",
  file: "projects/tieng-viet.spec.ts",
  title: "Tiếng Việt",
  kind: "project",
  role: "Tiếng Việt — a Vietnamese learning app that takes dialect seriously",
  org: "Personal project",
  location: "iOS · SwiftUI",
  period: "In progress",
  brief:
    "A Vietnamese learning app for iOS. Most apps flatten the language into one accent; this one records the alphabet three times — North, Central (Huế) and South — with a different native speaker for each, because those regions genuinely do not sound alike and a learner who only ever hears Hanoi is unprepared for Saigon. Speaking practice grades pronunciation through Apple's on-device speech recognition, alongside a matching-pair game, phrase and sentence practice, and a bundled Vietnamese–English dictionary. Built in SwiftUI, with the game logic pulled into a view model so it could carry real XCTest coverage.",
  stack: [
    "Swift",
    "SwiftUI",
    "Speech Framework",
    "XCTest",
    "iOS",
  ],
  tests: [
    {
      id: "viet-dialects",
      title: "the alphabet is recorded in three regional dialects",
      duration: 2456,
      status: "passed",
      note: "North, Central (Huế) and South, each voiced by a different native speaker, with a dialect selector wired through the app so a learner can choose the accent they actually need.",
      tags: ["Dialects", "Audio", "Localisation"],
    },
    {
      id: "viet-speech",
      title: "pronunciation is graded by Apple's speech recognition",
      duration: 3184,
      status: "passed",
      note: "Speaking practice captures the learner saying a word and checks it against on-device speech recognition — feedback on production, not just recognition.",
      tags: ["Speech Framework", "On-device", "Pronunciation"],
    },
    {
      id: "viet-games",
      title: "a matching-pair game drills vocabulary",
      duration: 2038,
      status: "passed",
      note: "Game logic lives in its own view model, which is what makes it unit-testable rather than tangled into the view.",
      tags: ["SwiftUI", "MVVM", "Games"],
    },
    {
      id: "viet-practice",
      title: "practice covers words, phrases and full sentences",
      duration: 2612,
      status: "passed",
      tags: ["Practice", "Curriculum"],
    },
    {
      id: "viet-dictionary",
      title: "a Vietnamese–English dictionary ships with the app",
      duration: 1725,
      status: "passed",
      note: "Bundled offline, so lookups work without a network round trip.",
      tags: ["Dictionary", "Offline"],
    },
    {
      id: "viet-tests",
      title: "the game logic is unit-tested in XCTest",
      duration: 2903,
      status: "passed",
      note: "Pulling the matching-game state into its own view model is what made it testable at all, and it has real XCTest coverage — selection toggling, ordering, and match resolution — rather than the scaffolding Xcode gives you for free.",
      tags: ["XCTest", "Unit Testing", "MVVM"],
    },
  ],
};

const education: Spec = {
  id: "education",
  file: "education/credentials.spec.ts",
  title: "Education",
  role: "B.S. Computer Science",
  org: "University of Massachusetts, Lowell",
  location: "Lowell, MA",
  period: "2012",
  brief:
    "Computer science at UMass Lowell, with a semester of CS coursework abroad at the American University of Sharjah.",
  stack: ["Computer Science"],
  tests: [
    {
      id: "edu-bs",
      title: "B.S. Computer Science — University of Massachusetts, Lowell",
      duration: 1204,
      status: "passed",
      note: "Graduated 2012.",
      tags: ["2012"],
    },
    {
      id: "edu-abroad",
      title: "Study Abroad, Computer Science — American University of Sharjah",
      duration: 688,
      status: "passed",
      note: "Sharjah, United Arab Emirates. 2008.",
      tags: ["2008"],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* The one that fails                                                  */
/* ------------------------------------------------------------------ */

const availability: Spec = {
  id: "availability",
  file: "availability.spec.ts",
  title: "Availability",
  role: "Open to Senior SDET roles",
  org: "—",
  location: "Austin, TX · Remote",
  period: "Now",
  brief:
    "One assertion in this suite does not pass. It is the only one that is supposed to be fixed by someone other than me.",
  stack: ["Python", "pytest", "API Testing", "Airflow", "Kubernetes", "CI/CD"],
  tests: [
    {
      id: "avail-experience",
      title: `candidate has ${YEARS_EXPERIENCE}+ years of software quality experience`,
      duration: 512,
      status: "passed",
      tags: ["Verified"],
    },
    {
      id: "avail-offmarket",
      title: "candidate is off the market",
      duration: 1893,
      status: "failed",
      note: "This is the only failing test on the site. It is reproducible, and the fix is documented in the stack trace.",
      failure: {
        matcher: "await expect(candidate).toBeUnavailable()",
        expected: '"unavailable"',
        received: '"available immediately"',
        location: "availability.spec.ts:14:29",
        codeFrame: [
          { n: 11, text: "" },
          { n: 12, text: "  test('candidate is off the market', async ({ market }) => {" },
          { n: 13, text: "    const candidate = await market.find('Manny Castillo');" },
          { n: 14, text: "    await expect(candidate).toBeUnavailable();", highlight: true, caret: 28 },
          { n: 15, text: "  });" },
          { n: 16, text: "" },
        ],
        // Email and phone are appended by the renderer via <Email /> and
        // <Phone />; only the LinkedIn URL is safe to hold as plain data.
        trace: [{ label: contact.linkedin, href: contact.linkedinUrl }],
      },
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Suites                                                              */
/* ------------------------------------------------------------------ */

export const suites: Suite[] = [
  {
    id: "career",
    title: "career",
    specs: [sorcero, playstation, symantec, emc],
  },
  {
    id: "projects",
    title: "projects",
    specs: [askTheLibrary, fare, tiengviet, sorceror, tesseract],
  },
  {
    id: "education",
    title: "education",
    specs: [education],
  },
  {
    id: "availability",
    title: "availability",
    specs: [availability],
  },
];

export const allSpecs: Spec[] = suites.flatMap((s) => s.specs);
export const allTests: Test[] = allSpecs.flatMap((s) => s.tests);

/* ------------------------------------------------------------------ */
/* Skills, as a coverage report                                        */
/* ------------------------------------------------------------------ */

export const skillGroups: SkillGroup[] = [
  {
    id: "languages",
    file: "languages.ts",
    label: "Languages",
    items: ["Python", "TypeScript", "JavaScript", "Go", "Bash"],
    coverage: { stmts: 97.4, branch: 94.1, funcs: 100, lines: 97.4 },
  },
  {
    id: "backend-api",
    file: "backend-api-testing.ts",
    label: "Backend & API Testing",
    items: [
      "pytest",
      "API Testing",
      "FastAPI",
      "REST",
      "GraphQL",
      "Integration Testing",
      "Microservices Testing",
      "Postman",
      "Test Plans & Strategy",
    ],
    coverage: { stmts: 99.1, branch: 96.4, funcs: 100, lines: 99.1 },
  },
  {
    id: "data-pipelines",
    file: "data-pipelines.ts",
    label: "Data & Pipelines",
    items: [
      "Airflow",
      "Google Cloud Composer",
      "Data Pipeline Validation",
      "Nightly Regression Runs",
      "Kafka",
      "PostgreSQL",
      "AlloyDB",
      "Elasticsearch",
    ],
    coverage: { stmts: 96.8, branch: 92.7, funcs: 98.4, lines: 96.8 },
  },
  {
    id: "ml-llm",
    file: "ml-llm-validation.ts",
    label: "ML & LLM Validation",
    items: [
      "ML/LLM Output Validation",
      "MLOps Support",
      "Non-deterministic Testing",
      "RAG & Retrieval Grounding",
      "Vector Search (kNN)",
      "Self-hosted LLMs (Ollama)",
      "LLM-Assisted Test Engineering",
    ],
    coverage: { stmts: 93.6, branch: 89.2, funcs: 95.8, lines: 93.6 },
  },
  {
    id: "cloud",
    file: "cloud-infra.ts",
    label: "Cloud & Infrastructure",
    items: [
      "AWS (EC2, S3, Lambda, boto3)",
      "Google Cloud",
      "Kubernetes",
      "Docker",
      "Linux",
      "Distributed Systems",
    ],
    coverage: { stmts: 95.2, branch: 90.8, funcs: 96.7, lines: 95.2 },
  },
  {
    id: "performance",
    file: "performance-reliability.ts",
    label: "Performance & Reliability",
    items: [
      "JMeter",
      "Locust",
      "Grafana",
      "Prometheus",
      "Benchmarking",
      "Metrics Analysis",
      "Automated Failure Triage",
    ],
    coverage: { stmts: 95.9, branch: 91.4, funcs: 97.2, lines: 95.9 },
  },
  {
    id: "cicd",
    file: "cicd-devops.ts",
    label: "CI/CD & DevOps",
    items: [
      "GitLab CI/CD",
      "GitHub Actions",
      "Jenkins",
      "Git",
      "Secure Workflows",
      "Distributed Test Execution",
    ],
    coverage: { stmts: 97.3, branch: 93.6, funcs: 98.8, lines: 97.3 },
  },
  {
    id: "web-ui-testing",
    file: "web-mobile-ui-testing.ts",
    label: "Web & Mobile UI Testing",
    items: [
      "Playwright (TypeScript)",
      "Maestro (iOS)",
      "XCTest",
      "XCUITest",
      "Selenium",
      "End-to-End (E2E) Testing",
      "Mobile E2E Testing",
      "UI Smoke Testing",
      "Cross-Browser Testing",
      "Regression Testing",
    ],
    coverage: { stmts: 100, branch: 98.6, funcs: 100, lines: 100 },
  },
  {
    id: "web-technologies",
    file: "web-technologies.ts",
    label: "Web Technologies",
    items: ["HTML", "CSS", "JavaScript", "REST", "GraphQL", "OAuth2"],
    coverage: { stmts: 93.2, branch: 88.7, funcs: 95.5, lines: 93.2 },
  },
  {
    id: "internal-tooling",
    file: "internal-tooling.ts",
    label: "Internal Tooling",
    items: [
      "Chrome Extensions",
      "Three.js",
      "D3.js",
      "Data Visualization",
      "Developer Experience",
    ],
    coverage: { stmts: 92.5, branch: 87.3, funcs: 95.0, lines: 92.5 },
  },
  {
    id: "systems",
    file: "hardware-systems.ts",
    label: "Hardware & Systems Validation",
    items: [
      "Enterprise Storage (SLIC, DAE, DPE, SP)",
      "Environmental Dwell Testing",
      "VMware ESXi",
      "Debugging",
      "Root Cause Analysis",
      "Reliability Testing",
    ],
    coverage: { stmts: 99.2, branch: 96.8, funcs: 100, lines: 99.2 },
  },
];

export const credentials: Credential[] = [
  {
    degree: "B.S. Computer Science",
    institution: "University of Massachusetts",
    location: "Lowell, MA",
    year: "2012",
  },
  {
    degree: "Study Abroad, Computer Science",
    institution: "American University of Sharjah",
    location: "Sharjah, U.A.E.",
    year: "2008",
  },
];

/* ------------------------------------------------------------------ */
/* Derived totals                                                      */
/* ------------------------------------------------------------------ */

export const totals = {
  specs: allSpecs.length,
  tests: allTests.length,
  passed: allTests.filter((t) => t.status === "passed").length,
  failed: allTests.filter((t) => t.status === "failed").length,
  /** Wall-clock if the suite ran with 4 workers, roughly. */
  durationMs: Math.round(allTests.reduce((a, t) => a + t.duration, 0) / 4),
};
