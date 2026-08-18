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
  },
};

export default function Page() {
  return <RaceLab />;
}
