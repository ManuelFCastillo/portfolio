/**
 * Per-post thumbnail art for the Field Notes index.
 *
 * One isometric illustration per post, generated to a shared visual system:
 * near-black ground with faint circuit traces, blue for the main flow, green
 * used exactly once for the thing that succeeded (or was never asked).
 * Each image is the post's mechanism, not decoration.
 */

import Image from "next/image";

interface Art {
  src: string;
  alt: string;
}

const ART: Record<string, Art> = {
  "anatomy-of-a-guard-that-never-passed": {
    src: "/blog/guard-never-passed.png",
    alt: "Cutaway engineering plate of a brass gatehouse mechanism. A teal channel carrying token 712 passes through an open gate to the outlet; an oxblood channel carrying token 891 is stopped by a dropped detent. A comparator arm reads an open ledger listing 706 to 744, with 712 highlighted and 891 absent. A closed book beside the machine is lettered FORK'S OWN LEDGER, NEVER CONSULTED. Numbered callouts name the code paths.",
  },
  "anatomy-of-an-intermittent-500": {
    src: "/blog/intermittent-500.png",
    alt: "Cutaway engineering plate of a brass manifold. Two inlet pipes carry ordered teal blocks, a third carries unformed oxblood material, and all three merge into one outlet stamped 500",
  },
  "anatomy-of-an-undeclared-caption-track": {
    src: "/blog/undeclared-caption.png",
    alt: "A chain of blue video frame blocks feeding a gate with one lit slot, while a green path bypasses the gate entirely and arrives at the output beside it",
  },
  "anatomy-of-a-race-condition": {
    src: "/blog/race-condition.png",
    alt: "Two chains of blocks, one blue and one green, converging on a single shared slot from opposite sides",
  },
  "anatomy-of-an-undefined-symbol": {
    src: "/blog/undefined-symbol.png",
    alt: "A chain of linked blue blocks reaching toward a missing dashed block, while an unused green block sits off to the side",
  },
};

export function PostArt({ slug }: { slug: string }) {
  const art = ART[slug];
  if (!art) return null;
  return (
    <div className="post-card-art">
      <Image
        src={art.src}
        alt={art.alt}
        width={640}
        height={360}
        sizes="(max-width: 560px) 240px, 220px"
      />
    </div>
  );
}
