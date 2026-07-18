'use client';

import { useMemo } from 'react';
import { getMoveReportUi } from '../i18n/ui';
import { resolveMoveReportDisplayName } from '../lib/compute';
import type { MoveReportLocale } from '../lib/locale';

type LoadingProps = {
  displayName?: string;
  locale?: MoveReportLocale;
};

/** 보고서 직전: 이름 있으면 “○○의 리포트”로 연결 */
export default function Loading({ displayName, locale = 'ko' }: LoadingProps) {
  const ui = useMemo(() => getMoveReportUi(locale), [locale]);
  const owner = resolveMoveReportDisplayName(displayName ?? '', locale);
  const lines = ui.loading.preparing(owner).split('\n');

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% 40%, rgba(255,75,31,.12) 0%, transparent 55%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-15%',
          width: '55vw',
          maxWidth: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,75,31,.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', textAlign: 'center', zIndex: 1, maxWidth: 320 }}>
        <div
          style={{
            fontFamily: 'Bebas Neue,sans-serif',
            fontSize: 'clamp(52px, 16vw, 88px)',
            lineHeight: 1,
            letterSpacing: '0.32em',
            color: '#FF4B1F',
            fontWeight: 400,
            textShadow: '0 0 48px rgba(255,75,31,.35), 0 2px 0 rgba(0,0,0,.4)',
          }}
        >
          SPOKEDU
        </div>
        <div
          style={{
            width: 'min(200px, 55vw)',
            height: 3,
            margin: '20px auto 0',
            borderRadius: 2,
            background: 'linear-gradient(90deg, #FF4B1F, rgba(255,75,31,.15), transparent)',
          }}
        />
        <p
          style={{
            margin: '22px 0 0',
            fontSize: 15,
            fontWeight: 700,
            color: 'rgba(255,255,255,.88)',
            letterSpacing: '-0.02em',
            wordBreak: 'keep-all',
            lineHeight: 1.45,
          }}
        >
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
