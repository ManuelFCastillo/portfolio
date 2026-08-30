import type { Metadata } from "next";
import { CaptionLab } from "@/components/blog/CaptionLab";

export const metadata: Metadata = {
  title: "The Anatomy of an Undeclared Caption Track",
  description:
    "A player offering a caption track the manifest never declared, traced into the bytes inside H.264 frames and fixed upstream in hls.js, with a CEA-608 decoder you can step through.",
  openGraph: {
    type: "article",
    title: "The Anatomy of an Undeclared Caption Track",
    description:
      "Two caption channels, one declaration, and a player that used it for the label but not the decision.",
    url: "https://www.mannycastillo.dev/blog/anatomy-of-an-undeclared-caption-track",
    images: [
      {
        url: "https://www.mannycastillo.dev/blog/undeclared-caption.png",
        width: 1774,
        height: 887,
        alt: "A chain of blue video frame blocks feeding a gate with one lit slot, while a green path bypasses the gate entirely and arrives at the output beside it",
      },
    ],
  },
};

export default function Page() {
  return <CaptionLab />;
}
