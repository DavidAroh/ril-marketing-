"use client";

import * as React from "react";

/*
  The RIL hero mark (renaissancelabs.org) rendered as a living ASCII field.
  The real graphic (/assets/images/ril-hero.png — the abstract blue geometric
  composition from the site's hero) is rasterised once to a tiny offscreen
  canvas; each character cell samples the mark's opacity (its alpha silhouette,
  lightly textured by colour luminance) and maps it onto a dark->light ramp, so
  the ASCII IS the logo rather than an impression of it. A slow highlight scans
  across it while sparse particles drift through the transparent negative space.
  Honours prefers-reduced-motion with a single static frame. If the canvas can't
  be read, a soft block silhouette stands in so the panel is never empty.
*/

// The source art is portrait (561x715). Grid is sized to that aspect, corrected
// for the ~0.5 aspect of monospace cells (fewer rows than columns) so it never
// stretches.
const SRC_W = 561;
const SRC_H = 715;
const COLS = 72;
const ROWS = Math.round(COLS * (SRC_H / SRC_W) * 0.5); // 46

const RAMP = " .:-=+*#%@"; // dark -> light; denser glyph = brighter ink

// small, fast, deterministic hash -> [0,1)
function hash(x: number, y: number, s: number) {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Fallback silhouette if the canvas pixels can't be read: a soft centred block.
function fallbackMask(): Float32Array {
  const m = new Float32Array(COLS * ROWS);
  const mx = COLS / 2 - 0.5;
  const my = ROWS / 2 - 0.5;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const dx = Math.abs(x - mx) / (COLS * 0.42);
      const dy = Math.abs(y - my) / (ROWS * 0.42);
      const d = Math.max(dx, dy);
      m[y * COLS + x] = d < 1 ? 0.55 + 0.35 * (1 - d) : 0;
    }
  }
  return m;
}

export function AsciiLogo({ className }: { className?: string }) {
  const ref = React.useRef<HTMLPreElement>(null);

  React.useEffect(() => {
    const pre = ref.current;
    if (!pre) return;

    let raf = 0;
    let cancelled = false;

    const run = (mask: Float32Array) => {
      const render = (time: number) => {
        const scanX = ((time * 0.04) % (COLS + 26)) - 13;
        const drift = Math.floor(time * 0.006);
        let out = "";
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            const m = mask[y * COLS + x];
            if (m > 0.08) {
              // tonal edges: faint at the silhouette's edge, dense at its core
              const glow = Math.max(0, 1 - Math.abs(x - scanX) / 9) * 0.22;
              const flick = (hash(x, y, Math.floor(time / 130)) - 0.5) * 0.1;
              let b = 0.28 + 0.72 * Math.min(1, m) + glow + flick;
              b = b < 0 ? 0 : b > 1 ? 1 : b;
              out += RAMP[Math.round(b * (RAMP.length - 1))];
            } else {
              // barely-there drift, so the negative space breathes without noise
              const n = hash(x, (y + drift) % ROWS, 7);
              out += n > 0.986 ? "·" : " ";
            }
          }
          out += "\n";
        }
        return out;
      };

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        pre.textContent = render(0);
        return;
      }
      let last = 0;
      const start = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        raf = requestAnimationFrame(tick);
        if (now - last < 55) return; // ~18fps, retro cadence
        last = now;
        pre.textContent = render(now - start);
      };
      raf = requestAnimationFrame(tick);
    };

    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (cancelled) return;
      let mask: Float32Array;
      try {
        const cv = document.createElement("canvas");
        cv.width = COLS;
        cv.height = ROWS;
        const ctx = cv.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("no 2d context");
        ctx.imageSmoothingEnabled = true; // smooth downscale -> anti-aliased edges
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, COLS, ROWS);
        const { data } = ctx.getImageData(0, 0, COLS, ROWS);
        mask = new Float32Array(COLS * ROWS);
        let max = 0;
        for (let i = 0; i < mask.length; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const bl = data[i * 4 + 2];
          const a = data[i * 4 + 3] / 255;
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * bl) / 255;
          // opacity carries the silhouette; luminance adds a little interior texture
          const v = a * (0.55 + 0.45 * lum);
          mask[i] = v;
          if (v > max) max = v;
        }
        if (max > 0) for (let i = 0; i < mask.length; i++) mask[i] /= max;
        else mask = fallbackMask();
      } catch {
        mask = fallbackMask();
      }
      run(mask);
    };
    img.onerror = () => {
      if (!cancelled) run(fallbackMask());
    };
    img.src = "/assets/images/ril-hero.png";

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={className} aria-hidden>
      <pre
        ref={ref}
        className="m-0 select-none font-mono leading-none"
        style={{ fontSize: "clamp(6px, 1.05vw, 14px)", lineHeight: 1 }}
      />
    </div>
  );
}
