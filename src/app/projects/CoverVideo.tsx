"use client";

import { useEffect, useRef } from "react";

/**
 * A tile's moving cover: still until the tile is hovered or focused, then it
 * plays. On touch screens there is no hover, so it plays while on screen.
 * Reduced motion keeps it still.
 */
export function CoverVideo({ src, poster, alt }: { src: string; poster: string; alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const play = () => void video.play().catch(() => {});
    const stop = () => video.pause();

    if (window.matchMedia("(hover: none)").matches) {
      const seen = new IntersectionObserver(([e]) => (e.isIntersecting ? play() : stop()), { threshold: 0.6 });
      seen.observe(video);
      return () => seen.disconnect();
    }
    const tile = video.closest(".project-tile") ?? video;
    tile.addEventListener("mouseenter", play);
    tile.addEventListener("mouseleave", stop);
    tile.addEventListener("focusin", play);
    tile.addEventListener("focusout", stop);
    return () => {
      tile.removeEventListener("mouseenter", play);
      tile.removeEventListener("mouseleave", stop);
      tile.removeEventListener("focusin", play);
      tile.removeEventListener("focusout", stop);
    };
  }, []);

  return <video ref={ref} src={src} poster={poster} aria-label={alt} muted loop playsInline preload="metadata" />;
}
