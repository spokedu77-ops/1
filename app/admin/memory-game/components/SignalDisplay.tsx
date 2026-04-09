'use client';

import React from 'react';

export const SignalDisplay = React.memo(function SignalDisplay({
  signal,
  animKey,
}: {
  signal: Record<string, unknown> | null;
  animKey: number;
}) {
  if (!signal) return null;
  const type = signal.type as string;
  const content = signal.content as Record<string, unknown> | undefined;
  const C: React.CSSProperties = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };

  if (type === 'full_color')
    return (
      <div key={animKey} className="signal-blink" style={C}>
        {content && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', userSelect: 'none' }}>
            <div style={{ fontSize: 'clamp(80px,18vw,180px)', lineHeight: 1, color: content.textColor as string, opacity: 0.35 }}>{content.symbol as string}</div>
          </div>
        )}
      </div>
    );

  if (type === 'arrow')
    return (
      <div key={animKey} className="signal-blink" style={{ ...C, flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontSize: 'clamp(110px,26vw,280px)', color: '#fff', lineHeight: 1, fontWeight: 900, textShadow: '0 4px 50px rgba(0,0,0,0.4)' }}>{content?.icon as string}</div>
        <div style={{ fontSize: 'clamp(28px,6vw,56px)', color: 'rgba(255,255,255,0.75)', fontWeight: 700, letterSpacing: '0.05em' }}>{content?.label as string}</div>
      </div>
    );

  if (type === 'basic_variant_color') {
    const panels = ((content?.panels as Array<{ slide?: { imageUrl?: string; color?: { name?: string; text?: string } } | null } | null>) ?? []);
    return (
      <div
        key={animKey}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          justifyContent: 'stretch',
          background: '#0F172A',
          /* 전체 대비 살짝만 작게: 테두리로 다크 배경 노출 */
          padding: 'clamp(100px, 14vw, 180px)',
          gap: 2,
          boxSizing: 'border-box',
        }}
      >
        {[0, 1].map((idx) => {
          const item = panels[idx] as { slide?: { imageUrl?: string; color?: { name?: string; text?: string } } } | null | undefined;
          const slide = item?.slide;
          return (
            <div
              key={idx}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                height: '100%',
                background: '#000',
                overflow: 'hidden',
                transform: 'translateZ(0)',
              }}
            >
              {slide?.imageUrl && (
                <img
                  src={slide.imageUrl}
                  alt=""
                  draggable={false}
                  loading="eager"
                  decoding="async"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    transform: 'translateZ(0)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (type === 'number')
    return (
      <div key={animKey} className="signal-blink" style={C}>
        <div style={{ fontSize: 'clamp(180px,38vw,400px)', color: '#fff', lineHeight: 1, fontWeight: 900, textShadow: '0 4px 60px rgba(0,0,0,0.5)' }}>{content?.label as string}</div>
      </div>
    );

  if (type === 'stroop_arrow') {
    const arrowId = content?.arrowId as string | undefined;
    const fillHex = (content?.fillHex as string | undefined) ?? '#FFFFFF';
    const rot = arrowId === 'up' ? 0 : arrowId === 'right' ? 90 : arrowId === 'down' ? 180 : -90;
    return (
      <div key={animKey} className="signal-blink" style={C}>
        <svg
          viewBox="0 0 100 130"
          preserveAspectRatio="xMidYMid meet"
          style={{
            /* 화면(뷰포트 짧은 변) 기준 약 50% — 풀스크린 훈련에서 한눈에 보이도록 */
            width: 'clamp(7.5rem, 50vmin, min(92vw, 92vh))',
            height: 'clamp(7.5rem, 50vmin, min(92vw, 92vh))',
            filter: 'drop-shadow(0 10px 48px rgba(0,0,0,0.5))',
          }}
          aria-hidden
        >
          {/* 꼬리(몸통)를 viewBox 세로 확장으로 실제로 길게: 머리·날개는 유지, 몸통만 아래로 연장 */}
          <g transform={`rotate(${rot} 50 67)`}>
            <path
              d="M 50 8 L 88 62 L 62 62 L 62 122 L 38 122 L 38 62 L 12 62 Z"
              fill={fillHex}
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={1}
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>
    );
  }

  if (type === 'stroop')
    return (
      <div key={animKey} className="signal-blink" style={C}>
        <div style={{ fontSize: 'clamp(80px,20vw,260px)', fontWeight: 900, color: content?.textHex as string, lineHeight: 1, letterSpacing: '-0.03em', textAlign: 'center', textShadow: '0 0 80px rgba(0,0,0,0.6)' }}>{content?.word as string}</div>
      </div>
    );

  if (type === 'dual_num') {
    const col = content?.color as { text?: string } | undefined;
    const tc = col?.text ?? '#fff';
    return (
      <div key={animKey} className="signal-blink" style={C}>
        <div style={{ fontSize: 'clamp(180px,38vw,400px)', color: tc, lineHeight: 1, fontWeight: 900, textShadow: '0 4px 60px rgba(0,0,0,0.35)' }}>{(content?.number as { label?: string })?.label}</div>
      </div>
    );
  }

  if (type === 'dual_color_arrow') {
    const arr = content?.arrow as { icon?: string } | undefined;
    return (
      <div key={animKey} className="signal-blink" style={C}>
        <div
          style={{
            fontSize: 'clamp(150px, 36vw, 380px)',
            color: '#0a0a0a',
            lineHeight: 1,
            fontWeight: 900,
          }}
        >
          {arr?.icon}
        </div>
      </div>
    );
  }

  return null;
});
