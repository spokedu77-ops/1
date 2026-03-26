'use client';

import type { BreakdownResult } from '../types';

interface RadarProps {
  bd: BreakdownResult;
  col: string;
}

/** 원본 HTML 8축 레이더 (C,P,E,D,I,G,R,S) */
export default function Radar({ bd, col }: RadarProps) {
  const cx = 110;
  const cy = 110;
  const mr = 80;
  const vals: Record<string, number> = {
    C: bd.social.l,
    I: bd.social.r,
    R: bd.structure.l,
    E: bd.structure.r,
    P: bd.motivation.l,
    G: bd.motivation.r,
    D: bd.energy.l,
    S: bd.energy.r,
  };
  const keys = ['C', 'P', 'E', 'D', 'I', 'G', 'R', 'S'];
  const angles = [-90, -45, 0, 45, 90, 135, 180, -135];
  const labs = ['협동', '과정', '탐색', '동적', '독립', '목표', '규칙', '정적'];

  const xy = (a: number, r: number) => {
    const rad = (a * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
  };

  const minR = mr * 0.18;
  const poly = keys
    .map((k, i) => {
      const r = Math.max((vals[k] / 3) * mr, minR);
      const [x, y] = xy(angles[i], r);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox="0 0 220 220"
      style={{ width: '100%', maxWidth: 240, display: 'block', margin: '0 auto' }}
      aria-hidden
    >
      {[0.33, 0.66, 1].map((l, i) => {
        const gp = angles
          .map((a) => {
            const [x, y] = xy(a, mr * l);
            return `${x},${y}`;
          })
          .join(' ');
        return (
          <polygon
            key={i}
            points={gp}
            fill="none"
            stroke="#333"
            strokeWidth={i === 2 ? 1.5 : 1}
            strokeDasharray={i < 2 ? '3,3' : undefined}
          />
        );
      })}
      {angles.map((a, i) => {
        const [x, y] = xy(a, mr);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#2A2A2A" strokeWidth="1" />;
      })}
      <polygon
        points={poly}
        fill={`${col}20`}
        stroke={col}
        strokeWidth="2.5"
        strokeLinejoin="round"
        className="radar-path"
      />
      {keys.map((k, i) => {
        const r = Math.max((vals[k] / 3) * mr, minR);
        const [x, y] = xy(angles[i], r);
        return (
          <circle key={k} cx={x} cy={y} r="4" fill={col} stroke="#161616" strokeWidth="2" />
        );
      })}
      {labs.map((l, i) => {
        const [x, y] = xy(angles[i], mr + 17);
        return (
          <text
            key={l}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#888"
            fontSize="10"
            fontFamily="Noto Sans KR,sans-serif"
            fontWeight="600"
          >
            {l}
          </text>
        );
      })}
    </svg>
  );
}
