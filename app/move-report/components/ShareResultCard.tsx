'use client';

import type { Profile } from '../types';

interface ShareResultCardProps {
  displayName: string;
  profileCode: string;
  p: Profile;
}

export default function ShareResultCard({ displayName, profileCode, p }: ShareResultCardProps) {
  const codeLabels = [
    { code: profileCode[0] ?? '', label: profileCode[0] === 'C' ? '협동형' : '독립형' },
    { code: profileCode[1] ?? '', label: profileCode[1] === 'R' ? '규칙 친화' : '탐구 지향' },
    { code: profileCode[2] ?? '', label: profileCode[2] === 'P' ? '과정 중시' : '목표 지향' },
    { code: profileCode[3] ?? '', label: profileCode[3] === 'D' ? '동적 에너지' : '정적 에너지' },
  ];

  return (
    <div
      data-share-card="move-report"
      style={{
        width: 1080,
        background: '#0A0A0A',
        color: '#fff',
        fontFamily: 'Noto Sans KR, sans-serif',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        padding: '90px 80px 70px',
      }}
    >
      {/* 배경 장식 */}
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
        {/* SPOKEDU 우상단 브랜딩 */}
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

        {/* 유형코드 뱃지 I R G D */}
        <div style={{ display: 'inline-flex', gap: 14, marginBottom: 36 }}>
          {profileCode.split('').map((c, i) => (
            <div
              key={i}
              style={{
                width: 86,
                height: 86,
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${p.col}22`,
                border: `2px solid ${p.col}60`,
                boxShadow: `0 0 20px ${p.col}30`,
              }}
            >
              <span
                style={{
                  fontFamily: 'Bebas Neue, sans-serif',
                  fontSize: 50,
                  lineHeight: 1,
                  color: p.col,
                  display: 'block',
                }}
              >
                {c}
              </span>
            </div>
          ))}
        </div>

        {/* 코드 라벨 뱃지 */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
          {codeLabels.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
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
                  fontFamily: 'Bebas Neue, sans-serif',
                  fontSize: 28,
                  lineHeight: 1,
                  color: p.col,
                  display: 'block',
                }}
              >
                {item.code}
              </span>
              <span
                style={{
                  fontSize: 22,
                  lineHeight: 1,
                  color: 'rgba(255,255,255,.7)',
                  fontWeight: 600,
                  display: 'block',
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* 캐치카피 */}
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

        {/* 이모지 + 유형명 섹션 */}
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

        {/* 키워드 태그 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 40 }}>
          {p.kw.map((k, i) => (
            <span
              key={i}
              style={{
                fontSize: 22,
                fontWeight: 700,
                padding: '10px 20px',
                borderRadius: 10,
                letterSpacing: '.04em',
                background: 'rgba(255,255,255,.07)',
                color: 'rgba(255,255,255,.75)',
                border: '1px solid rgba(255,255,255,.12)',
              }}
            >
              {k}
            </span>
          ))}
        </div>

        {/* 설명 텍스트 */}
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

        {/* 하단 브랜딩 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 40,
            paddingTop: 24,
            borderTop: '1px solid #2A2A2A',
          }}
        >
          <div style={{ fontSize: 20, color: '#A5A5A5', fontWeight: 600 }}>Instagram @spokedu_kids</div>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, color: '#FF4B1F', letterSpacing: '.05em' }}>
            SPOKEDU
          </div>
        </div>
      </div>
    </div>
  );
}
