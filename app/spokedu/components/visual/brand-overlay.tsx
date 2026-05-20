'use client';

import type { HomeMediaTone } from '../../data/home-media';

const toneGlow: Record<HomeMediaTone, string> = {
  indigo: 'from-indigo-500/35 via-transparent to-lime-400/15',
  sky: 'from-sky-400/30 via-transparent to-cyan-500/10',
  lime: 'from-lime-400/25 via-transparent to-emerald-600/15',
  amber: 'from-amber-400/30 via-transparent to-orange-500/10',
  rose: 'from-rose-400/25 via-transparent to-pink-500/10',
  violet: 'from-violet-500/30 via-transparent to-fuchsia-500/10',
  slate: 'from-indigo-500/20 via-transparent to-slate-400/10',
};

type BrandOverlayProps = {
  tone?: HomeMediaTone;
  intensity?: 'soft' | 'bold';
  className?: string;
};

/** 실사진 위 브랜드 톤 그라데이션·글로우 (생사진 그대로 노출 방지) */
export function BrandOverlay({ tone = 'indigo', intensity = 'bold', className = '' }: BrandOverlayProps) {
  const soft = intensity === 'soft';
  return (
    <>
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${toneGlow[tone]} ${soft ? 'opacity-90' : 'opacity-100'} ${className}`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-t via-slate-900/15 to-indigo-950/10 ${soft ? 'from-slate-950/50' : 'from-slate-950/60'}`}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-6 top-0 h-32 w-32 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />
    </>
  );
}
