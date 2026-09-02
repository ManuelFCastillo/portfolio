import type { Metadata } from "next";
import { GuardLab } from "@/components/blog/GuardLab";

export const metadata: Metadata = {
  title: "The Anatomy of a Guard That Never Passed",
  description:
    "A GitHub Actions hardening fix that blocked artifact poisoning and, for six months, every outside contributor with it. Traced, reported and fixed upstream in falcosecurity, with a validation simulator you can run.",
  openGraph: {
    type: "article",
    title: "The Anatomy of a Guard That Never Passed",
    description:
      "It was correct for everyone who could run it and broken for everyone who could not. If you have to filter the answer, you asked the wrong question.",
    url: "https://www.mannycastillo.dev/blog/anatomy-of-a-guard-that-never-passed",
  },
};

export default function Page() {
  return <GuardLab />;
}
