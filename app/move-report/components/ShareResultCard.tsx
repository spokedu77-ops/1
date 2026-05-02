'use client';

import type { Profile } from '../types';
import { axisLabelsFromProfileKey } from '../lib/profileAxisLabels';

export type ShareResultCardVariant = 'default' | 'viralShare';

/** default 캡처용 카드 높이 참고(px). viralShare는 반응형 포스터로 고정 높이 미사용 */
export function getShareResultCardOuterHeight(variant: ShareResultCardVariant): number {
  return variant === 'viralShare' ? 0 : 1420;
}

interface ShareResultCardProps {
  displayName: string;
  profileCode: string;
  p: Profile;
  /** default: 기존 캡처용 레이아웃. viralShare: 공유 전용 바이럴 카드 */
  variant?: ShareResultCardVariant;
}

const VIRAL_POSTER_DESC_FALLBACK = '아이의 움직임 성향을 긍정적으로 보여주는 MOVE REPORT 결과입니다.';

/** shared 바이럴 카드용 설명: `desc` 원문은 읽기만 하고, 완결된 1~2문장만 사용(말줄임·substring 금지). */
function viralPosterDisplayDesc(rawDesc: string): string {
  const t = rawDesc.trim();
  if (!t) return VIRAL_POSTER_DESC_FALLBACK;

  const MAX_TOTAL = 118;

  const segments = t
    .split(/\.\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const sentences =
    segments.length === 0
      ? [t]
      : segments.map((s, i) => {
          if (i < segments.length - 1) {
            return s.endsWith('.') ? s : `${s}.`;
          }
          return s.endsWith('.') || s.endsWith('!') || s.endsWith('?') ? s : `${s}.`;
        });

  const first = sentences[0] ?? '';
  if (!first) return VIRAL_POSTER_DESC_FALLBACK;
  if (first.length > MAX_TOTAL) return VIRAL_POSTER_DESC_FALLBACK;

  if (sentences.length === 1) {
    return first;
  }

  const second = sentences[1] ?? '';
  const combined = `${first} ${second}`.replace(/\s+/g, ' ').trim();
  if (combined.length <= MAX_TOTAL) {
    return combined;
  }

  return first;
}

function DefaultShareResultCard({ displayName, profileCode, p }: Omit<ShareResultCardProps, 'variant'>) {
  const axisLabels = axisLabelsFromProfileKey(profileCode) ?? [];

  return (
    <div
      data-share-card="move-report"
      style={{
        width: 1080,
        minHeight: 1420,
        background: '#0A0A0A',
        color: '#fff',
        fontFamily: 'Noto Sans KR, sans-serif',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        padding: '90px 80px 70px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          right: '-8%',
          width: '65%',
          height: '65%',
          background: `radial-gradient(circle,${p.col}40 0%,transparent 65%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '5%',
          left: '-8%',
          width: '45%',
          height: '45%',
          background: 'radial-gradient(circle,rgba(255,176,32,.12) 0%,transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.04,
          backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
          backgroundSize: '50px 50px',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            position: 'absolute',
            top: -68,
            right: 0,
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 36,
            letterSpacing: '.1em',
            color: '#FF4B1F',
          }}
        >
          SPOKEDU
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48, alignItems: 'center' }}>
          {axisLabels.map((label, i) => (
            <div
              key={i}
              style={{
                display: 'inline-flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                borderRadius: 14,
                background: `${p.col}18`,
                border: `1.5px solid ${p.col}35`,
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  lineHeight: 1.25,
                  color: 'rgba(255,255,255,.85)',
                  fontWeight: 700,
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginBottom: 48,
            padding: '24px 30px',
            background: `${p.col}18`,
            border: `1.5px solid ${p.col}40`,
            borderRadius: 18,
          }}
        >
          <p
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: '#fff',
              margin: 0,
              lineHeight: 1.4,
              letterSpacing: '-.01em',
              wordBreak: 'keep-all',
            }}
          >
            &quot;{p.catchcopy}&quot;
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 40, marginBottom: 40 }}>
          <div
            style={{
              fontSize: 150,
              lineHeight: 1,
              filter: `drop-shadow(0 0 40px ${p.col}80)`,
              flexShrink: 0,
            }}
          >
            {p.em}
          </div>
          <div style={{ paddingTop: 16 }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '.08em',
                color: p.col,
                marginBottom: 14,
              }}
            >
              {displayName || '우리 아이'}의 MOVE 유형
            </div>
            <div
              style={{
                fontFamily: 'Black Han Sans, sans-serif',
                fontSize: 76,
                color: '#fff',
                lineHeight: 1.1,
                letterSpacing: '-.01em',
                textShadow: `0 0 50px ${p.col}50`,
              }}
            >
              {p.char}
            </div>
            <div
              style={{
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: 34,
                letterSpacing: '.06em',
                color: p.col,
                marginTop: 12,
              }}
            >
              {p.title}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 40, alignItems: 'center' }}>
          {p.kw.map((k, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 20px',
                borderRadius: 10,
                letterSpacing: '.04em',
                background: 'rgba(255,255,255,.07)',
                color: 'rgba(255,255,255,.75)',
                border: '1px solid rgba(255,255,255,.12)',
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {k}
            </span>
          ))}
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,.5)',
            border: '1px solid #2A2A2A',
            borderLeft: `6px solid ${p.col}`,
            borderRadius: 18,
            padding: '34px 38px',
          }}
        >
          <p
            style={{
              fontSize: 26,
              fontWeight: 500,
              color: '#CCCCCC',
              lineHeight: 1.65,
              margin: 0,
              wordBreak: 'keep-all',
            }}
          >
            {p.desc}
          </p>
        </div>
      </div>
    </div>
  );
}

function ViralShareResultCard({ displayName, p }: Omit<ShareResultCardProps, 'variant' | 'profileCode'>) {
  const keywords = p.kw.slice(0, 4);
  const tipText = typeof p.shortTip === 'string' ? p.shortTip.trim() : '';
  const posterDesc = viralPosterDisplayDesc(p.desc);

  return (
    <div
      data-share-card="move-report"
      data-share-variant="poster"
      className="mr-poster-card"
      aria-label={`${displayName || '우리 아이'}의 MOVE REPORT`}
      style={{
        ['--poster-accent' as string]: p.col,
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      <div className="mr-poster-card-glow" aria-hidden />
      <div className="mr-poster-card-grain" aria-hidden />

      <div className="mr-poster-card-inner">
        <header className="mr-poster-head">
          <div className="mr-poster-brand-sm">SPOKEDU</div>
          <div className="mr-poster-brand-lg">MOVE REPORT</div>
          <p className="mr-poster-sub">우리 아이의 움직임 성향</p>
        </header>

        <div className="mr-poster-hero">
          <div className="mr-poster-emoji" aria-hidden>
            {p.em}
          </div>
          <div className="mr-poster-hero-text">
            <h1 className="mr-poster-type-name">{p.char}</h1>
            <p className="mr-poster-catchcopy">
              <span aria-hidden>{'\u201c'}</span>
              {p.catchcopy}
              <span aria-hidden>{'\u201d'}</span>
            </p>
            <p className="mr-poster-type-meta">{p.title}</p>
          </div>
        </div>

        <ul className="mr-poster-pills" aria-label="성향 키워드">
          {keywords.map((k, i) => (
            <li key={i} className="mr-poster-pill">
              {k}
            </li>
          ))}
        </ul>

        <p className="mr-poster-desc">{posterDesc}</p>

        {tipText ? (
          <div className="mr-poster-tip">
            <span className="mr-poster-tip-label">이 아이에게 잘 통하는 말</span>
            <p className="mr-poster-tip-text">{tipText}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ShareResultCard({ displayName, profileCode, p, variant = 'default' }: ShareResultCardProps) {
  if (variant === 'viralShare') {
    return <ViralShareResultCard displayName={displayName} p={p} />;
  }
  return <DefaultShareResultCard displayName={displayName} profileCode={profileCode} p={p} />;
}
