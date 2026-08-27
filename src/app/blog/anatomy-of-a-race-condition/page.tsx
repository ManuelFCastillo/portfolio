import type { Metadata } from "next";
import { RaceLab } from "@/components/blog/RaceLab";

export const metadata: Metadata = {
  title: "The Anatomy of a Race Condition",
  description:
    "Seven JavaScript mechanisms inside one real open-source bug fix — taught interactively, with a playable race-condition simulator.",
  openGraph: {
    type: "article",
    title: "The Anatomy of a Race Condition",
    description:
      "Seven JavaScript mechanisms inside one real open-source bug fix — taught interactively.",
    url: "https://www.mannycastillo.dev/blog/anatomy-of-a-race-condition",
    images: [
      {
        url: "https://www.mannycastillo.dev/blog/race-condition.png",
        width: 1200,
        height: 630,
        alt: "Two chains of blocks converging on a single shared slot",
      },
    ],
  },
};

export default function Page() {
  return <RaceLab />;
}
