"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient background for the Field Notes index: an original particle
 * system rather than a stock image. Two intertwined strands of glowing
 * particles — a slow data-helix — flow diagonally across the page with
 * loose data-dust around them. Hovering a post card raises the system's
 * "energy": flow quickens, particles brighten, and the field leans
 * toward the cursor.
 *
 * Performance: canvas 2D, ~260 particles drawn from pre-rendered glow
 * sprites (no per-frame shadowBlur), devicePixelRatio capped at 2, the
 * loop stops while the tab is hidden, and prefers-reduced-motion gets a
 * single static frame instead of animation.
 */
export function FieldNotesBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const styles = getComputedStyle(document.documentElement);
    const blue = styles.getPropertyValue("--accent").trim() || "#4cc2ff";
    // Amber leads, echoing the particle-wave art direction; blue answers.
    const amber = "#f0a848";

    // Pre-rendered glow sprite per color: a radial falloff drawn once,
    // then stamped with drawImage — an order of magnitude cheaper than
    // shadowBlur on every particle every frame.
    function sprite(color: string): HTMLCanvasElement {
      const s = document.createElement("canvas");
      s.width = s.height = 64;
      const g = s.getContext("2d")!;
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, color);
      grad.addColorStop(0.25, color);
      grad.addColorStop(1, "transparent");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      return s;
    }
    const sprites = [sprite(amber), sprite(blue), sprite("#d9b98c")];

    interface P {
      t: number;      // position along the helix axis, 0..1
      strand: number; // 0 = blue strand, 1 = green strand, 2 = dust
      jitter: number; // per-particle phase noise
      size: number;
      dx: number;     // dust drift
      dy: number;
    }

    const N = 260;
    const particles: P[] = [];
    for (let i = 0; i < N; i++) {
      const dust = i > N * 0.72;
      particles.push({
        t: Math.random(),
        strand: dust ? 2 : (i % 3 === 2 ? 1 : 0),  // amber-dominant 2:1
        jitter: Math.random() * Math.PI * 2,
        size: dust ? 0.5 + Math.random() * 0.9 : 0.8 + Math.random() * 1.4,
        dx: (Math.random() - 0.5) * 0.02,
        dy: (Math.random() - 0.5) * 0.012,
      });
    }

    let W = 0, H = 0, dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    // Hover energy: 0 at rest, eased toward 1 while any post card is
    // hovered. Modulates flow speed, brightness, and cursor lean.
    let energy = 0;
    let targetEnergy = 0;
    let mx = -1e4, my = -1e4;
    const over = (e: Event) =>
      (e.target as Element).closest?.(".post-card") && (targetEnergy = 1);
    const out = (e: Event) =>
      (e.target as Element).closest?.(".post-card") && (targetEnergy = 0);
    const move = (e: PointerEvent) => { mx = e.clientX; my = e.clientY; };
    document.addEventListener("pointerover", over, true);
    document.addEventListener("pointerout", out, true);
    document.addEventListener("pointermove", move, { passive: true });

    const TWISTS = 3.2;      // full rotations along the axis
    let time = Math.random() * 100;

    function frame(dt: number) {
      ctx!.clearRect(0, 0, W, H);
      ctx!.globalCompositeOperation = "lighter";

      // Helix axis: lower-left toward upper-right, biased into the top
      // right quadrant where the CSS mask lets it live.
      const ox = W * 0.30, oy = H * 0.86;
      const ax = W * 0.95, ay = -H * 0.98;
      const nx = -ay, ny = ax;                       // normal (unnormalised)
      const nlen = Math.hypot(nx, ny);
      const ux = nx / nlen, uy = ny / nlen;
      const R = Math.min(H * 0.13, 120) ;

      const flow = dt * (0.010 + 0.008 * energy);
      const alpha = 0.5 + 0.3 * energy;

      // Rungs between the strands, drawn beneath the particles.
      ctx!.globalAlpha = 0.09 + 0.07 * energy;
      ctx!.strokeStyle = amber;
      ctx!.lineWidth = 1;
      for (let k = 0; k < 14; k++) {
        const t = ((k / 14 + time * 0.010) % 1 + 1) % 1;
        const phase = t * TWISTS * Math.PI * 2 + time * 0.35;
        const bx = ox + ax * t, by = oy + ay * t;
        const off = Math.sin(phase) * R;
        const depth = Math.cos(phase);              // -1..1, "camera" depth
        if (Math.abs(depth) > 0.55) continue;       // skip edge-on rungs
        ctx!.beginPath();
        ctx!.moveTo(bx + ux * off, by + uy * off);
        ctx!.lineTo(bx - ux * off, by - uy * off);
        ctx!.stroke();
      }

      for (const p of particles) {
        let x: number, y: number, depth = 1;
        if (p.strand === 2) {
          p.t = ((p.t + p.dx * dt * 0.02 + flow * 0.15) % 1 + 1) % 1;
          const spread = Math.sin(p.jitter * 37.7) * R * 3.2;
          x = ox + ax * p.t + ux * spread + Math.sin(time * 0.4 + p.jitter) * 6;
          y = oy + ay * p.t + uy * spread + Math.cos(time * 0.3 + p.jitter) * 6;
        } else {
          p.t = ((p.t + flow * 0.06) % 1 + 1) % 1;
          const phase =
            p.t * TWISTS * Math.PI * 2 + time * 0.35 +
            p.strand * Math.PI + Math.sin(time * 0.6 + p.jitter) * 0.12;
          depth = (Math.cos(phase) + 1.6) / 2.6;    // 0.23..1 size/alpha mod
          x = ox + ax * p.t + ux * Math.sin(phase) * R;
          y = oy + ay * p.t + uy * Math.sin(phase) * R;
        }

        // Cursor lean: nearby particles ease toward the pointer a little,
        // scaled by energy so the field only responds while a card glows.
        const ddx = mx - x, ddy = my - y;
        const d2 = ddx * ddx + ddy * ddy;
        if (energy > 0.01 && d2 < 320 * 320) {
          const pull = (1 - d2 / (320 * 320)) * 10 * energy;
          const d = Math.sqrt(d2) || 1;
          x += (ddx / d) * pull;
          y += (ddy / d) * pull;
        }

        const s = sprites[p.strand];
        const size = p.size * 10 * depth;
        ctx!.globalAlpha = alpha * depth * (p.strand === 2 ? 0.4 : 1.0);
        ctx!.drawImage(s, x - size / 2, y - size / 2, size, size);
      }
      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = "source-over";
    }

    let raf = 0;
    let last = performance.now();
    function loop(now: number) {
      const dt = Math.min((now - last) / 16.7, 3); // frames of ~60fps, capped
      last = now;
      time += dt * 0.016;
      energy += (targetEnergy - energy) * 0.035 * dt;
      frame(dt);
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (reduced.matches) { frame(0); return; }   // one static frame
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    function stop() { cancelAnimationFrame(raf); }

    const vis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("resize", resize);
    reduced.addEventListener?.("change", () => { stop(); start(); });
    start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointerover", over, true);
      document.removeEventListener("pointerout", out, true);
      document.removeEventListener("pointermove", move);
    };
  }, []);

  return <canvas ref={canvasRef} className="blog-index-bg" aria-hidden="true" />;
}
