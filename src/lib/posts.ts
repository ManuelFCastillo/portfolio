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
}

export const posts: Post[] = [
  {
    slug: "anatomy-of-a-race-condition",
    title: "The Anatomy of a Race Condition",
    date: "2026-08-17",
    dek: "I traced a console error in Music Blocks to a positioning patch that silently lost a race against slow page loads. Inside that one small fix live seven JavaScript mechanisms every working engineer leans on daily — each one taught here with code you can poke, ending in a playable simulation of the race itself.",
    minutes: 25,
    kind: "interactive",
  },
];

export const sortedPosts = [...posts].sort((a, b) =>
  b.date.localeCompare(a.date),
);
