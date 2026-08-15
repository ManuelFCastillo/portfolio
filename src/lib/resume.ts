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
  email: string;
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

export const profile: Profile = {
  name: "Manny Castillo",
  fullName: "Manuel Castillo",
  title: "Senior Software Engineer in Test",
  headline: "Web UI Test Automation · Playwright · TypeScript · CI/CD",
  summary:
    "Senior SDET with 13+ years building end-to-end, smoke, and API test automation for customer-facing web applications and large-scale distributed systems. Hands-on owner of an 800+ test Playwright suite, with a track record of designing test frameworks and tooling, increasing automated coverage, and reducing release risk across enterprise SaaS and cybersecurity products.",
  yearsExperience: 13,
};

export const contact: Contact = {
  email: "Manuel.Franklin.Castillo@gmail.com",
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
  role: "Senior Software Engineer in Test (UI & Test Automation)",
  org: "Sorcero Inc.",
  location: "Remote",
  period: "2020 — Present",
  brief:
    "Test automation across two major platforms, their mobile app, and the data pipelines underneath — E2E and smoke suites in Playwright and TypeScript built with the QA team, iOS coverage in Maestro, and validation pushed down into Airflow with nightly runs over the pipelines. Where the tooling didn't exist to do that well, I built it: a Chrome extension the quality engineers used daily, and a visual runner that made disaster-recovery testing legible. Both are in the tools suite.",
  stack: [
    "Playwright",
    "TypeScript",
    "Maestro",
    "iOS",
    "Python",
    "Airflow",
    "Google Cloud Composer",
    "GitLab CI",
    "Jenkins",
    "JMeter",
    "Locust",
  ],
  tests: [
    {
      id: "sorcero-suite",
      title: "800+ test Playwright suite covers two major platforms",
      duration: 2847,
      status: "passed",
      note: "Built and maintained end-to-end and UI smoke coverage in TypeScript across two major customer-facing platforms, working alongside the QA team rather than in isolation.",
      tags: ["Playwright", "TypeScript"],
    },
    {
      id: "sorcero-mobile",
      title: "iOS mobile app covered by Maestro end-to-end flows",
      duration: 2611,
      status: "passed",
      note: "Extended automated coverage past the browser to the native mobile app, writing E2E flows for iOS in Maestro so mobile regressions surface in the same cycle as web.",
      tags: ["Maestro", "iOS", "Mobile E2E"],
    },
    {
      id: "sorcero-smoke",
      title: "smoke suite validates core platform functionality on every release",
      duration: 1932,
      status: "passed",
      note: "The full smoke suite runs against core platform functionality on each release, covering the paths a user hits first.",
      tags: ["E2E", "Smoke"],
    },
    {
      id: "sorcero-manual",
      title: "replaces several hours of manual validation each cycle",
      duration: 412,
      status: "passed",
      note: "Automation absorbed the manual regression pass that previously consumed hours of engineer time on every single release cycle.",
      tags: ["Regression"],
    },
    {
      id: "sorcero-airflow",
      title: "Airflow DAG tests validate data pipelines end to end",
      duration: 3104,
      status: "passed",
      note: "Authored API and integration tests that reach past the browser into the orchestration layer, asserting that Airflow DAGs running in Google Cloud Composer transform and land the data the product depends on — not just that the pipeline ran, but that what came out the other side was correct.",
      tags: ["Airflow", "Google Cloud Composer", "API Testing"],
    },
    {
      id: "sorcero-nightly",
      title: "nightly pipeline runs surface data regressions before users do",
      duration: 3688,
      status: "passed",
      note: "Scheduled nightly validation against the data pipelines, so breakages introduced during the day are caught overnight and triaged in the morning instead of being discovered in the product.",
      tags: ["Nightly", "Data Validation", "Airflow"],
    },
    {
      id: "sorcero-ci",
      title: "suites run in GitLab CI and Jenkins on every deployment",
      duration: 1544,
      status: "passed",
      note: "Wired into GitLab CI and Jenkins so the suites execute automatically as part of deployment — on a dedicated dev/QA environment during development, then again on each promotion to staging and to production.",
      tags: ["GitLab CI", "Jenkins", "CI/CD"],
    },
    {
      id: "sorcero-perf",
      title: "JMeter and Locust tooling surfaces system bottlenecks",
      duration: 2213,
      status: "passed",
      note: "Python-based performance tooling identifies front-end and back-end bottlenecks and feeds directly into optimization work.",
      tags: ["JMeter", "Locust", "Python"],
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
    "Five years building the test infrastructure other QA teams ran on. Internal Python frameworks, a dashboard test runner, and reliability metrics — plus large-scale migration testing as PlayStation Now expanded its datacenter footprint.",
  stack: ["Python", "Go", "AWS", "Prometheus", "Linux", "Distributed Systems"],
  tests: [
    {
      id: "ps-frameworks",
      title: "internal Python test frameworks adopted across QA teams",
      duration: 2456,
      status: "passed",
      note: "Built and enhanced test frameworks and reusable helper libraries that became shared infrastructure for automated testing org-wide.",
      tags: ["Python"],
    },
    {
      id: "ps-aws",
      title: "tooling integrates with AWS for automated test execution",
      duration: 1187,
      status: "passed",
      tags: ["AWS", "EC2", "S3"],
    },
    {
      id: "ps-dashboard",
      title: "dashboard test runner executes and reports on automated suites",
      duration: 3390,
      status: "passed",
      note: "Designed the backend architecture for an in-house dashboard test runner — the system QA teams used to launch suites and read results.",
      tags: ["Python", "Architecture"],
    },
    {
      id: "ps-migration",
      title: "datacenter migration testing supports SRE at scale",
      duration: 4021,
      status: "passed",
      note: "Led QA initiatives supporting SRE teams through large-scale datacenter migration testing for the expansion of PlayStation Now infrastructure.",
      tags: ["SRE", "Distributed Systems"],
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
    "Where the automation habit started: hardware validation and regression testing for enterprise storage platforms, driven by Python frameworks and Jenkins.",
  stack: ["Python", "Jenkins", "Linux", "Storage"],
  tests: [
    {
      id: "emc-hardware",
      title: "hardware validation and regression testing on enterprise storage",
      duration: 2603,
      status: "passed",
      tags: ["Regression"],
    },
    {
      id: "emc-python",
      title: "Python automation frameworks drive platform validation",
      duration: 1428,
      status: "passed",
      tags: ["Python"],
    },
    {
      id: "emc-linux",
      title: "Linux builds managed and reproducible",
      duration: 771,
      status: "passed",
      tags: ["Linux"],
    },
    {
      id: "emc-jenkins",
      title: "Jenkins extended with custom Python plugin modifications",
      duration: 1109,
      status: "passed",
      note: "Modified Jenkins plugins in Python to make the build system do what the test strategy required.",
      tags: ["Jenkins", "Python"],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Tools built for the quality org                                     */
/* ------------------------------------------------------------------ */

const sorceror: Spec = {
  id: "sorceror",
  file: "tools/sorceror.spec.ts",
  title: "Sorceror",
  kind: "project",
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
  file: "tools/tesseract.spec.ts",
  title: "Sorcero: Tesseract",
  kind: "project",
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
  stack: ["Playwright", "TypeScript", "Python", "CI/CD"],
  tests: [
    {
      id: "avail-experience",
      title: "candidate has 13+ years of software quality experience",
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
        // The phone is appended by the renderer via <Phone />, not listed here.
        trace: [
          { label: contact.email, href: `mailto:${contact.email}` },
          { label: contact.linkedin, href: contact.linkedinUrl },
        ],
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
    id: "tools",
    title: "tools",
    specs: [sorceror, tesseract],
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
    items: ["Python", "TypeScript", "JavaScript", "Bash"],
    coverage: { stmts: 97.4, branch: 94.1, funcs: 100, lines: 97.4 },
  },
  {
    id: "web-ui-testing",
    file: "web-mobile-ui-testing.ts",
    label: "Web & Mobile UI Testing",
    items: [
      "Playwright (TypeScript)",
      "Maestro (iOS)",
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
    id: "test-tooling",
    file: "test-tooling.ts",
    label: "Test Tooling & API",
    items: [
      "Postman",
      "pytest",
      "API Testing",
      "Data Pipeline Validation",
      "Nightly Regression Runs",
      "Test Plans & Strategy",
    ],
    coverage: { stmts: 98.1, branch: 95.0, funcs: 100, lines: 98.1 },
  },
  {
    id: "performance",
    file: "performance.ts",
    label: "Performance & Validation",
    items: [
      "JMeter",
      "Locust",
      "Grafana",
      "Prometheus",
      "Benchmarking",
      "Metrics Analysis",
    ],
    coverage: { stmts: 91.8, branch: 86.4, funcs: 94.7, lines: 91.8 },
  },
  {
    id: "cicd",
    file: "cicd-devops.ts",
    label: "CI/CD & DevOps",
    items: ["Git", "GitLab CI/CD", "Jenkins", "Docker", "Kubernetes"],
    coverage: { stmts: 95.6, branch: 91.9, funcs: 97.2, lines: 95.6 },
  },
  {
    id: "cloud",
    file: "cloud-infra.ts",
    label: "Cloud & Infrastructure",
    items: [
      "AWS (EC2, S3, Lambda)",
      "Google Cloud",
      "Linux",
      "Distributed Systems",
    ],
    coverage: { stmts: 90.3, branch: 84.2, funcs: 92.8, lines: 90.3 },
  },
  {
    id: "data",
    file: "data-messaging.ts",
    label: "Data & Messaging",
    items: ["Kafka", "PostgreSQL", "AlloyDB", "Elasticsearch"],
    coverage: { stmts: 88.9, branch: 82.5, funcs: 90.1, lines: 88.9 },
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
    file: "systems.ts",
    label: "Systems",
    items: ["Debugging", "Root Cause Analysis", "Reliability Testing"],
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
