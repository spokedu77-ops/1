'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseMoveReportSharePayload } from '../lib/shareLink';

export default function MoveReportSharedContent() {
  const searchParams = useSearchParams();
  const payload = useMemo(() => parseMoveReportSharePayload(searchParams.get('d')), [searchParams]);

  if (!payload) {
    return (
      <main style={{ minHeight: '100vh', background: '#0D0D0D', color: '#fff', padding: '24px', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 420, borderRadius: 18, border: '1px solid #2A2A2A', background: '#171717', padding: 20 }}>
          <h1 style={{ fontSize: 22, marginBottom: 10, fontWeight: 800 }}>공유 결과를 불러올 수 없어요</h1>
          <p style={{ color: '#B9B9B9', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
            링크가 만료되었거나 형식이 올바르지 않습니다.
          </p>
          <Link
            href="/move-report"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '12px 16px',
              borderRadius: 10,
              background: '#FEE500',
              color: '#3C1E1E',
              textDecoration: 'none',
              fontWeight: 800,
            }}
          >
            나도 결과 해보기
          </Link>
        </div>
      </main>
    );
  }

  const accentColor = payload.color ?? '#FEE500';
  const accentColorDim = `${accentColor}22`;
  const accentColorBorder = `${accentColor}55`;
  const accentColorGlow = `${accentColor}30`;

  return (
    <main style={{ minHeight: '100vh', background: '#0D0D0D', color: '#fff', padding: '24px', display: 'grid', placeItems: 'center' }}>
      <section style={{ width: '100%', maxWidth: 460, borderRadius: 20, border: `1px solid ${accentColorBorder}`, background: 'linear-gradient(160deg,#141414,#1B1B1B)', padding: 22, boxShadow: `0 0 40px ${accentColorGlow}` }}>
        <p style={{ fontSize: 12, color: '#A2A2A2', letterSpacing: '.08em', fontWeight: 700, marginBottom: 10 }}>MOVE SHARED RESULT</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          {payload.emoji ? (
            <span style={{ fontSize: 48, lineHeight: 1, filter: `drop-shadow(0 0 16px ${accentColor}80)` }}>{payload.emoji}</span>
          ) : null}
          <h1 style={{ fontSize: 28, lineHeight: 1.25, fontWeight: 900, margin: 0 }}>
            {payload.name}의 유형은
            <br />
            <span style={{ color: accentColor }}>{payload.profileName}</span>
          </h1>
        </div>

        <p
          style={{
            fontSize: 15,
            color: '#E4E4E4',
            lineHeight: 1.6,
            borderLeft: `3px solid ${accentColor}`,
            paddingLeft: 12,
            marginBottom: 16,
          }}
        >
          &quot;{payload.catchcopy}&quot;
        </p>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 13, color: '#9A9A9A', marginBottom: 8 }}>강점 포인트</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {payload.strengths.map((item, idx) => (
              <span key={idx} style={{ padding: '6px 10px', borderRadius: 999, border: `1px solid ${accentColorBorder}`, background: accentColorDim, fontSize: 13 }}>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div style={{ borderRadius: 12, background: accentColorDim, border: `1px solid ${accentColorBorder}`, padding: '12px 14px', marginBottom: 18 }}>
          <p style={{ fontSize: 12, color: accentColor, marginBottom: 6, fontWeight: 700 }}>추천 활동</p>
          <p style={{ fontSize: 15, color: '#FFFBE7', lineHeight: 1.5, fontWeight: 700 }}>{payload.activity}</p>
        </div>

        <Link
          href="/move-report"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '13px 16px',
            borderRadius: 12,
            background: accentColor,
            color: '#111',
            textDecoration: 'none',
            fontWeight: 900,
            fontSize: 15,
          }}
        >
          나도 MOVE 리포트 해보기
        </Link>
      </section>
    </main>
  );
}
