import React, { useId } from 'react';

// Original Steel Ball Run drawings: steel ball, horseshoe, ゴゴゴ, tumbleweed, backdrop and the closing arrow.

interface SteelBallProps {
  size?: number;
  groove?: boolean;
  className?: string;
}

// Rows of engraved slots around the ball, seen with its top tipped toward the viewer.
const TILT = (24 * Math.PI) / 180;
const slotRows = (lats: number[]) =>
  lats.map((deg) => {
    const lat = (deg * Math.PI) / 180;
    const rx = 15.5 * Math.cos(lat);
    const ry = rx * Math.sin(TILT);
    const cy = 20 - 15.5 * Math.sin(lat) * Math.cos(TILT);
    return `M ${(20 - rx).toFixed(2)} ${cy.toFixed(2)} A ${rx.toFixed(2)} ${ry.toFixed(2)} 0 0 0 ${(20 + rx).toFixed(2)} ${cy.toFixed(2)}`;
  });
const ROWS_DETAILED = slotRows([40, 12, -16]);
const ROWS_SIMPLE = slotRows([22, -18]);

// The steel ball, inked like a manga panel: white paper sphere, screentone shadow, cut slots.
export const SteelBall: React.FC<SteelBallProps> = ({ size = 28, groove = true, className = '' }) => {
  const id = useId().replace(/:/g, '');
  const detailed = size >= 22;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={`shrink-0 ${className}`} aria-hidden="true">
      <defs>
        <clipPath id={`ball${id}`}>
          <circle cx="20" cy="20" r="18" />
        </clipPath>
        <pattern id={`tone${id}`} width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx="1.3" cy="1.3" r="0.75" fill="#1c1410" />
        </pattern>
      </defs>
      <circle cx="20" cy="20" r="18" fill="#f6f2ea" />
      <g clipPath={`url(#ball${id})`}>
        {/* core shadow as screentone, a crescent on the side away from the light */}
        <path d="M40 0 V40 H0 C14 40 34 32 34 14 C34 8 32 3 28 0Z" fill={detailed ? `url(#tone${id})` : '#9a9690'} opacity={detailed ? 0.9 : 1} />
        <path d="M40 18 V40 H18 C30 38 38 30 40 18Z" fill="#1c1410" opacity="0.85" />
        {groove &&
          (detailed ? ROWS_DETAILED : ROWS_SIMPLE).map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#1c1410" strokeWidth={detailed ? 2 : 2.6} strokeDasharray="3 1.6" />
          ))}
        {/* blank-paper highlight with an ink glint */}
        <ellipse cx="13" cy="11.5" rx="5.5" ry="3.4" fill="#ffffff" transform="rotate(-32 13 11.5)" />
        {detailed && <path d="M9.5 15.5 Q8 12 11 8.5" fill="none" stroke="#1c1410" strokeWidth="0.9" strokeLinecap="round" />}
      </g>
      <circle cx="20" cy="20" r="18" fill="none" stroke="#1c1410" strokeWidth={detailed ? 2 : 2.6} />
    </svg>
  );
};

// Horseshoe in the lucide stroke style, so it sits beside lucide icons.
export const Horseshoe: React.FC<{ className?: string; dashed?: boolean }> = ({ className = 'w-4 h-4', dashed = false }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M7 20.5 6.1 12A5.9 5.9 0 0 1 17.9 12L17 20.5" strokeDasharray={dashed ? '2.6 2.4' : undefined} />
    <path d="M5 20.5h3.6M15.4 20.5H19" />
    {!dashed && (
      <g fill="currentColor" stroke="none">
        <circle cx="8.4" cy="13" r="0.9" />
        <circle cx="15.6" cy="13" r="0.9" />
        <circle cx="12" cy="8.6" r="0.9" />
      </g>
    )}
  </svg>
);

// ゴゴゴ: the menacing sound effect, marking work that will miss its due date.
export const Menacing: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg
    width={size * 1.9}
    height={size}
    viewBox="0 0 76 40"
    className={`menacing shrink-0 overflow-visible ${className}`}
    aria-hidden="true"
  >
    {[
      { x: 0, y: 34, s: 30, r: -10 },
      { x: 26, y: 26, s: 24, r: 6 },
      { x: 50, y: 20, s: 19, r: -4 },
    ].map((g, i) => (
      <text
        key={i}
        x={g.x}
        y={g.y}
        fontSize={g.s}
        transform={`rotate(${g.r} ${g.x + g.s / 2} ${g.y - g.s / 2})`}
        className="font-menace fill-rose-500 dark:fill-rose-400 stroke-slate-900 dark:stroke-zinc-950"
        strokeWidth="2.4"
        paintOrder="stroke"
        style={{ animationDelay: `${i * 0.18}s` }}
      >
        ゴ
      </text>
    ))}
  </svg>
);

// A tumbleweed rolling through an empty column.
export const Tumbleweed: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 48 48" className={`tumbleweed w-9 h-9 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
    <circle cx="24" cy="24" r="16" strokeDasharray="5 3 9 4" />
    <path d="M10 20c8-6 20-7 28 2M12 31c6 4 18 5 25-4M18 9c-4 9-4 22 3 30M30 10c3 8 2 21-5 29M8 26c10 1 22-3 31-11M15 37c4-9 13-17 25-20" />
  </svg>
);

// Golden rectangle cut into ever-smaller squares, with the quarter arcs that trace the golden spiral.
const PHI = (1 + Math.sqrt(5)) / 2;
function goldenRotation(x: number, y: number, w: number, steps = 9) {
  let r = { x, y, w, h: w / PHI };
  const squares: string[] = [];
  let arc = `M ${r.x} ${r.y + r.h}`;
  for (let i = 0; i < steps; i++) {
    const side = Math.min(r.w, r.h);
    let sq: { x: number; y: number };
    let end: { x: number; y: number };
    switch (i % 4) {
      case 0: sq = { x: r.x, y: r.y }; end = { x: r.x + side, y: r.y }; r = { x: r.x + side, y: r.y, w: r.w - side, h: r.h }; break;
      case 1: sq = { x: r.x, y: r.y }; end = { x: r.x + side, y: r.y + side }; r = { x: r.x, y: r.y + side, w: r.w, h: r.h - side }; break;
      case 2: sq = { x: r.x + r.w - side, y: r.y }; end = { x: r.x + r.w - side, y: r.y + side }; r = { x: r.x, y: r.y, w: r.w - side, h: r.h }; break;
      default: sq = { x: r.x, y: r.y + r.h - side }; end = { x: r.x, y: r.y + r.h - side }; r = { x: r.x, y: r.y, w: r.w, h: r.h - side }; break;
    }
    squares.push(`M ${sq.x} ${sq.y} h ${side} v ${side} h ${-side} Z`);
    arc += ` A ${side} ${side} 0 0 1 ${end.x} ${end.y}`;
  }
  return { squares: squares.join(' '), arc };
}
const GOLDEN = goldenRotation(700, 420, 900);

// Plain paper with one quiet reference: the golden rectangle and its spiral, drawn in hairline ink.
export const DesertBackdrop: React.FC = () => (
  <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
    <svg className="w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
      <rect width="1440" height="900" className="fill-[#f4ecdb] dark:fill-[#15102a]" />
      <g className="stroke-[#7f6449] dark:stroke-[#85779a]" fill="none">
        <path d={GOLDEN.squares} strokeWidth="1" opacity="0.14" />
        <path d={GOLDEN.arc} strokeWidth="1.5" opacity="0.3" />
      </g>
    </svg>
  </div>
);

// The "To be continued" arrow that closes a chapter: used where the schedule runs on past what is shown.
export const ToBeContinued: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 230 44" className={`h-7 w-auto ${className}`} role="img" aria-label="To be continued">
    <path
      d="M4 22 L30 4 V13 H222 L226 22 L222 31 H30 V40 Z"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill="none"
      className="stroke-slate-400 dark:stroke-zinc-600"
    />
    <text
      x="126"
      y="27"
      textAnchor="middle"
      fontSize="12"
      fontWeight="600"
      fontStyle="italic"
      letterSpacing="0.06em"
      className="fill-slate-500 dark:fill-zinc-500 font-sans uppercase"
    >
      To be continued
    </text>
  </svg>
);
