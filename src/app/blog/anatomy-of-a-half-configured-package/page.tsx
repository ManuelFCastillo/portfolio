import type { Metadata } from "next";
import { PostinstLab } from "@/components/blog/PostinstLab";

export const metadata: Metadata = {
  title: "The Anatomy of a Half-Configured Package",
  description:
    "Falco 0.45 left Ubuntu 20.04 half-configured without printing an error. Traced to set -e and one bare command substitution, with a set -e sandbox, a postinst stepper and the 48-cell qualification grid.",
  openGraph: {
    type: "article",
    title: "The Anatomy of a Half-Configured Package",
    description:
      "Two harmless lines, one silent postinst, and 48 real VMs to prove the fix.",
    url: "https://www.mannycastillo.dev/blog/anatomy-of-a-half-configured-package",
    images: [
      {
        url: "https://www.mannycastillo.dev/blog/half-configured-package.png",
        width: 1536,
        height: 1024,
        alt: "Cutaway engineering plate of an open Falco package box: control card, payload, postinst scroll with set -e, /etc/falco configs, falco-modern-bpf.service, and a dashed compartment of missing driver settings",
      },
    ],
  },
};

export default function Page() {
  return <PostinstLab />;
}
