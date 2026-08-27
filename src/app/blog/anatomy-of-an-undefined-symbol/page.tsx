import type { Metadata } from "next";
import { LinkerLab } from "@/components/blog/LinkerLab";

export const metadata: Metadata = {
  title: "The Anatomy of an Undefined Symbol",
  description:
    "A security sensor that fails only on old glibc, traced to a missing linker flag — with a step-through GNU ld simulation and the two-line fix submitted upstream.",
  openGraph: {
    type: "article",
    title: "The Anatomy of an Undefined Symbol",
    description:
      "One undefined symbol, one missing link flag, and a linker you can step through yourself.",
    url: "https://www.mannycastillo.dev/blog/anatomy-of-an-undefined-symbol",
    images: [
      {
        url: "https://www.mannycastillo.dev/blog/undefined-symbol.png",
        width: 1200,
        height: 630,
        alt: "A chain of linked blue blocks reaching toward a missing dashed block",
      },
    ],
  },
};

export default function Page() {
  return <LinkerLab />;
}
