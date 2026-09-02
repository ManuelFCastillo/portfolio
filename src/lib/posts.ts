/**
 * Field Notes registry. The blog index renders from this list; adding a
 * post is one entry here plus a route under src/app/blog/<slug>/.
 */
export interface Post {
  slug: string;
  title: string;
  /** ISO date, newest first in the index. */
  date: string;
  /** One-paragraph description shown on the index card. */
  dek: string;
  /** Reading-time hint shown in the card's meta line. */
  minutes: number;
  /** Distinguishes interactive labs from plain write-ups in the meta line. */
  kind: "interactive" | "write-up";
  /** Upstream repo the write-up is about, shown on the index card. */
  repo: string;
  /**
   * The verification claim for this post, shown beside the live diff size.
   * Diff numbers come from the GitHub API; this is the part that has to be
   * stated by hand, so keep it to facts that were actually run.
   */
  evidence?: string;
}

export const posts: Post[] = [
  {
    slug: "anatomy-of-a-guard-that-never-passed",
    title: "The Anatomy of a Guard That Never Passed",
    date: "2026-09-02",
    dek: "A security fix hardened a GitHub Actions workflow against artifact poisoning, and in doing so rejected every outside contributor for six months. Nobody noticed, because the only people who could see it working were the people it was never checking. I traced it from a CI failure on my own PR, reported it, had my proposed fix refused for a better reason than I expected, and shipped the maintainer's version to two repositories. Includes a validation simulator you can run.",
    minutes: 14,
    kind: "interactive",
    repo: "falcosecurity/plugins",
    evidence: "confirmed by the maintainer, two PRs open, byte-identical to the libs fix",
  },
  {
    slug: "anatomy-of-an-intermittent-500",
    title: "The Anatomy of an Intermittent 500",
    date: "2026-08-30",
    dek: "CrowdStrike's Python SDK was returning a 500 that never came from the API. The message was a Python exception, the status code was manufactured, and the response header support needed to research the failure had been thrown away. I traced it to one line in the error handler that calls .get() on raw bytes, found the adjacent open PR fixed two of the four trigger conditions but not the cause, and shipped the guard upstream. Includes a response path tracer you can step through.",
    minutes: 12,
    kind: "interactive",
    repo: "CrowdStrike/falconpy",
    evidence: "14 tests, no credentials required, 100% of added lines covered",
  },
  {
    slug: "anatomy-of-an-undeclared-caption-track",
    title: "The Anatomy of an Undeclared Caption Track",
    date: "2026-08-30",
    dek: "A stream declares one caption track and the player offers two. The extra one is real, decodable, and nowhere in the manifest. I traced it into the bytes riding inside H.264 frames, found a four year old issue where the declaration was read for the label but never for the decision, and shipped the fix upstream. The repro stream no longer existed, so I wrote a CEA-608 encoder to build one. Includes a wire decoder you can step through.",
    minutes: 15,
    kind: "interactive",
    repo: "video-dev/hls.js",
    evidence: "5 new tests, 1189 passing",
  },
  {
    slug: "anatomy-of-an-undefined-symbol",
    title: "The Anatomy of an Undefined Symbol",
    date: "2026-08-27",
    dek: "A security sensor that works everywhere modern silently refuses to start on half of enterprise Linux. I traced it from a red dashboard to a missing linker flag, proved the mechanism with one environment variable, and submitted the two-line fix upstream. Includes a linker you can step through yourself.",
    minutes: 15,
    kind: "interactive",
    repo: "falcosecurity/plugins",
    evidence: "no code changed, only linkage, verified on Debian 11, Ubuntu 24.04 and aarch64",
  },
  {
    slug: "anatomy-of-a-race-condition",
    title: "The Anatomy of a Race Condition",
    date: "2026-08-17",
    dek: "I traced a console error in Music Blocks to a positioning patch that silently lost a race against slow page loads. Inside that one small fix live seven JavaScript mechanisms every working engineer leans on daily — each one taught here with code you can poke, ending in a playable simulation of the race itself.",
    minutes: 25,
    kind: "interactive",
    repo: "sugarlabs/musicblocks",
    evidence: "reproduced in Chrome DevTools on throttled 3G, gone after the fix",
  },
];

export const sortedPosts = [...posts].sort((a, b) =>
  b.date.localeCompare(a.date),
);
