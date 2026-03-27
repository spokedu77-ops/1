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
          ...C,
          background: '#0F172A',
          padding: 'clamp(0.5rem, 2vw, 1rem)',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 8,
            width: '100%',
            maxWidth: 'min(92vw, 960px)',
            height: 'min(72vh, 560px)',
            maxHeight: 'min(72vh, 560px)',
            margin: '0 auto',
            alignItems: 'center',
            justifyContent: 'center',
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
                  height: '100%',
                  borderRadius: 0,
                  border: 'none',
                  background: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'none',
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
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
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
      </div>
    );
  }

  if (type === 'number')
    return (
      <div key={animKey} className="signal-blink" style={C}>
        <div style={{ fontSize: 'clamp(180px,38vw,400px)', color: '#fff', lineHeight: 1, fontWeight: 900, textShadow: '0 4px 60px rgba(0,0,0,0.5)' }}>{content?.label as string}</div>
      </div>
    );

  if (type === 'stroop')
    return (
      <div key={animKey} className="signal-blink" style={C}>
        <div style={{ fontSize: 'clamp(80px,20vw,260px)', fontWeight: 900, color: content?.textHex as string, lineHeight: 1, letterSpacing: '-0.03em', textAlign: 'center', textShadow: '0 0 80px rgba(0,0,0,0.6)' }}>{content?.word as string}</div>
      </div>
    );

  if (type === 'dual_num')
    return (
      <div key={animKey} className="signal-blink" style={C}>
        <div style={{ fontSize: 'clamp(180px,38vw,400px)', color: '#fff', lineHeight: 1, fontWeight: 900, textShadow: '0 4px 60px rgba(0,0,0,0.4)' }}>{(content?.number as { label?: string })?.label}</div>
      </div>
    );

  if (type === 'dual_action')
    return (
      <div key={animKey} className="signal-blink" style={{ ...C, flexDirection: 'column', gap: '1rem' }}>
        <span style={{ fontSize: 'clamp(5rem, 18vw, 8rem)', lineHeight: 1 }}>{(content?.action as { emoji?: string })?.emoji}</span>
        <span style={{ fontSize: 'clamp(1.2rem, 4vw, 2rem)', fontWeight: 700, color: '#fff' }}>{(content?.action as { label?: string })?.label}</span>
      </div>
    );

  if (type === 'dual_stroop_action')
    return (
      <div key={animKey} className="signal-blink" style={{ ...C, flexDirection: 'column', gap: '2rem' }}>
        <div style={{ fontSize: 'clamp(72px,16vw,200px)', fontWeight: 900, color: content?.textHex as string, letterSpacing: '-0.03em', textShadow: '0 0 60px rgba(0,0,0,0.5)' }}>{content?.word as string}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(255,255,255,0.15)', padding: '1.5rem 3rem', borderRadius: '2rem', backdropFilter: 'blur(8px)' }}>
          <span style={{ fontSize: 'clamp(5rem, 18vw, 8rem)', lineHeight: 1 }}>{(content?.action as { emoji?: string })?.emoji}</span>
          <span style={{ fontSize: 'clamp(1.2rem, 4vw, 2rem)', fontWeight: 700, color: '#fff' }}>{(content?.action as { label?: string })?.label}</span>
        </div>
      </div>
    );

  return null;
});
