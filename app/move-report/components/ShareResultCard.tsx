'use client';

import type { BreakdownResult } from '../types';
import Radar from './Radar';

interface ShareResultCardProps {
  displayName: string;
  profileCode: string;
  profileName: string;
  catchcopy: string;
  strengths: string[];
  recommendedActivity: string;
  bd: BreakdownResult;
  color: string;
}

export default function ShareResultCard({
  displayName,
  profileCode,
  profileName,
  catchcopy,
  strengths,
  recommendedActivity,
  bd,
  color,
}: ShareResultCardProps) {
  const safeName = displayName || '우리';
  const subject = /\s*아이$/.test(safeName) ? safeName.replace(/\s*아이$/, '') : safeName;

  return (
    <div
      data-share-card="move-report"
      style={{
        width: 1080,
        minHeight: 1580,
        background: 'linear-gradient(165deg,#090909 0%,#121212 52%,#171717 100%)',
        color: '#fff',
        borderRadius: 40,
        border: '1px solid #2E2E2E',
        padding: '66px 66px',
        fontFamily: 'Noto Sans KR,sans-serif',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,.45)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -160,
          right: -120,
          width: 540,
          height: 540,
          background: `radial-gradient(circle,${color}88 0%,${color}22 38%,transparent 72%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -150,
          left: -100,
          width: 440,
          height: 440,
          background: 'radial-gradient(circle,rgba(255,176,32,.18) 0%,transparent 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg,rgba(255,255,255,.06) 0%,rgba(255,255,255,0) 18%,rgba(255,255,255,0) 82%,rgba(255,255,255,.04) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            borderRadius: 999,
            border: `1px solid ${color}66`,
            background: `${color}20`,
            padding: '10px 16px',
            marginBottom: 18,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 18px ${color}` }} />
          <span style={{ fontSize: 22, letterSpacing: '.07em', color: '#ECECEC', fontWeight: 800 }}>MOVE RESULT CARD</span>
          <span
            style={{
              marginLeft: 6,
              padding: '4px 10px',
              borderRadius: 999,
              border: `1px solid ${color}99`,
              fontSize: 18,
              fontWeight: 900,
              color,
              letterSpacing: '.08em',
            }}
          >
            {profileCode}
          </span>
        </div>
        <div style={{ fontSize: 62, fontWeight: 900, lineHeight: 1.14, marginBottom: 14, letterSpacing: '-0.02em' }}>
          {subject || '우리'} 아이는
          <br />
          <span style={{ color, textShadow: `0 0 26px ${color}55` }}>{profileName}</span>
        </div>
        <div
          style={{
            fontSize: 30,
            lineHeight: 1.5,
            color: '#EAEAEA',
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.12)',
            borderLeft: `8px solid ${color}`,
            borderRadius: 24,
            padding: '26px 28px',
            marginBottom: 28,
            wordBreak: 'keep-all',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)',
          }}
        >
          &quot;{catchcopy}&quot;
        </div>

        <div
          style={{
            borderRadius: 24,
            border: '1px solid #303030',
            background: 'rgba(255,255,255,.03)',
            padding: '22px 24px',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: '#F4F4F4', marginBottom: 12, letterSpacing: '-0.01em' }}>강점 키워드</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {strengths.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 999,
                  border: `1px solid ${color}66`,
                  background: `${color}26`,
                  padding: '9px 14px',
                  fontSize: 22,
                  color: '#F3F3F3',
                  fontWeight: 700,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            borderRadius: 24,
            border: '1px solid #303030',
            background: 'rgba(255,255,255,.025)',
            padding: '20px 24px',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: '#F4F4F4', marginBottom: 12, letterSpacing: '-0.01em' }}>움직임 그래프</div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
            <Radar bd={bd} col={color} maxWidthPx={480} />
          </div>
        </div>

        <div
          style={{
            borderRadius: 24,
            border: `1px solid ${color}88`,
            background: `linear-gradient(135deg,${color}24,${color}12)`,
            padding: '24px 26px',
            marginBottom: 32,
            boxShadow: `inset 0 1px 0 ${color}44`,
          }}
        >
          <div style={{ fontSize: 23, color: '#EDEDED', fontWeight: 800, marginBottom: 8 }}>추천 활동</div>
          <div style={{ fontSize: 30, lineHeight: 1.4, color: '#FFFFFF', fontWeight: 800, letterSpacing: '-0.01em' }}>
            {recommendedActivity}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #2F2F2F', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 21, color: '#A5A5A5', fontWeight: 600 }}>Instagram @spokedu_kids</div>
          <div style={{ fontSize: 31, color: '#FF4B1F', fontWeight: 900, letterSpacing: '.04em' }}>SPOKEDU</div>
        </div>
      </div>
    </div>
  );
}
