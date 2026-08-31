import type { Metadata } from "next";
import { FalconLab } from "@/components/blog/FalconLab";

export const metadata: Metadata = {
  title: "The Anatomy of an Intermittent 500",
  description:
    "An SDK reporting a 500 that never came from the API, traced to one line in the error handler that calls .get() on raw bytes, and fixed upstream in CrowdStrike's FalconPy, with a response path tracer you can step through.",
  openGraph: {
    type: "article",
    title: "The Anatomy of an Intermittent 500",
    description:
      "Any status at or above 400 triggered it, but the symptom was always exactly 500. The number that would have told you which failure you hit was the number that got overwritten.",
    url: "https://www.mannycastillo.dev/blog/anatomy-of-an-intermittent-500",
    images: [
      {
        url: "https://www.mannycastillo.dev/blog/intermittent-500.png",
        width: 1447,
        height: 1087,
        alt: "Cutaway engineering plate of a brass manifold. Two inlet pipes carry ordered teal blocks, a third carries unformed oxblood material, and all three merge into one outlet stamped 500",
      },
    ],
  },
};

export default function Page() {
  return <FalconLab />;
}
