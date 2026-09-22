/*
  Renaissance columns rendered as a stippled point cloud — three Doric shafts
  eroding into the ground at the capitals, the way ruins photograph against a
  flat sky. Fully deterministic (seeded PRNG) so server and client agree and
  the field never reflows. Hook-free: safe in server or client components.
  Monochrome by intent — it renders in `currentColor`, so the parent decides
  whether the dots read as white on blue, ink on paper, or anything else.
*/

const VIEW_W = 900;
const VIEW_H = 1000;

// mulberry32 — small, fast, deterministic.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Dot = { x: number; y: number; r: number; o: number };

function buildColumn(cx: number, seed: number): Dot[] {
  const rng = mulberry32(seed);
  const dots: Dot[] = [];

  const top = 90; // capital begins
  const bottom = VIEW_H - 40; // base sits here
  const shaftTop = 210;
  const shaftBottom = bottom - 70;
  const shaftHalf = 78; // half-width of the fluted shaft
  const step = 7; // sampling grid pitch

  for (let y = top; y <= bottom; y += step) {
    let half: number;
    let edgeBias: number;
    if (y < shaftTop) {
      const t = (shaftTop - y) / (shaftTop - top);
      half = shaftHalf * (1 + t * 0.55);
      edgeBias = 0.35;
    } else if (y > shaftBottom) {
      const t = (y - shaftBottom) / (bottom - shaftBottom);
      half = shaftHalf * (1 + t * 0.5);
      edgeBias = 0.55;
    } else {
      const m = (y - shaftTop) / (shaftBottom - shaftTop);
      const entasis = Math.sin(m * Math.PI) * 6;
      half = shaftHalf + entasis;
      edgeBias = 0.5;
    }

    const heightFrac = (y - top) / (bottom - top);
    const survive = 0.28 + heightFrac * 0.62;

    for (let x = cx - half; x <= cx + half; x += step) {
      const nx = (x - cx) / half;
      const flute = 0.5 + 0.5 * Math.cos(nx * Math.PI * 7);
      const edge = Math.pow(Math.abs(nx), 1.6) * edgeBias + (1 - edgeBias);

      let p = survive * (0.45 + 0.55 * flute) * edge;
      if (y < shaftTop) p *= 0.55;
      if (rng() > p) continue;

      const jx = x + (rng() - 0.5) * step * 1.1;
      const jy = y + (rng() - 0.5) * step * 1.1;
      const r = 0.9 + rng() * 1.3;
      const o = 0.28 + rng() * 0.55 * (0.5 + heightFrac * 0.5);
      dots.push({ x: jx, y: jy, r, o });
    }
  }

  return dots;
}

const CENTRES = [
  { cx: 230, seed: 10427 },
  { cx: 470, seed: 55219 },
  { cx: 690, seed: 90833 },
];

const DOTS = CENTRES.flatMap((c) => buildColumn(c.cx, c.seed));

export function ColumnsArt({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-label="Three classical columns rendered as a field of stippled dots"
      fill="none"
    >
      <g fill="currentColor">
        {DOTS.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} opacity={d.o} />
        ))}
      </g>
    </svg>
  );
}
