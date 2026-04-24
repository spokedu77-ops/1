'use client';

import React from 'react';
import { PAD_POSITIONS } from '@/app/lib/admin/constants/padGrid';
import type { FruitSlide, VariantPanelContent } from '../lib/signals';

function variantCells(panel: VariantPanelContent | null | undefined): FruitSlide[] {
  if (!panel) return [];
  return panel.cells ?? (panel.slide ? [panel.slide] : []);
}

/** postimg 등 **직링크**만 사용 (next/image·최적화 경로 없음 — 환경마다 깨지는 문제 방지). */
function VariantFruitImg({ slide }: { slide: FruitSlide }) {
  return (
    <img
      src={slide.imageUrl}
      alt=""
      draggable={false}
      loading="eager"
      decoding="async"
      style={{
        width: '100%',
        height: '100%',
        flex: 1,
        minHeight: 0,
        objectFit: 'cover',
        objectPosition: 'center',
        display: 'block',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    />
  );
}

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

  if (type === 'think_quad') {
    const colorId = (content?.colorId as string) ?? '';
    const fillHex = (content?.fillHex as string) ?? '#EF4444';
    const symbol = content?.symbol as string | undefined;
    const textColor = (content?.textColor as string) ?? '#fff';
    return (
      <div
        key={animKey}
        className="signal-blink"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(0.75rem, 5vmin, 2.5rem)',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            maxWidth: 'min(96vw, 96vh)',
            maxHeight: 'min(96vw, 96vh)',
            aspectRatio: '1',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: 'clamp(6px, 1.2vw, 14px)',
            minHeight: 0,
          }}
        >
          {PAD_POSITIONS.map((row, ri) =>
            row.map((padColorId, ci) => {
              const isActive = padColorId === colorId;
              return (
                <div
                  key={`${ri}-${ci}`}
                  style={{
                    borderRadius: 12,
                    border: '1px solid rgba(148,163,184,0.55)',
                    backgroundColor: isActive ? fillHex : 'rgba(255,255,255,0.15)',
                    minHeight: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isActive && symbol ? (
                    <span style={{ fontSize: 'clamp(40px, 11vmin, 100px)', lineHeight: 1, color: textColor, opacity: 0.45, userSelect: 'none' }}>
                      {symbol}
                    </span>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (type === 'full_color' || type === 'gonogo_color')
    return (
      <div key={animKey} className="signal-blink" style={C}>
        {content && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', userSelect: 'none' }}>
            <div style={{ fontSize: 'clamp(80px,18vw,180px)', lineHeight: 1, color: content.textColor as string, opacity: 0.35 }}>{content.symbol as string}</div>
          </div>
        )}
      </div>
    );

  if (type === 'gonogo_shape') {
    const shape = content?.shape as 'circle' | 'triangle' | undefined;
    const fill = (content?.fillHex as string) ?? '#F8FAFC';
    const box = 'min(52vmin, 78vw)';
    return (
      <div key={animKey} className="signal-blink" style={C}>
        <div
          style={{
            width: box,
            height: box,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          {shape === 'circle' ? (
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: fill, boxShadow: '0 12px 48px rgba(0,0,0,0.35)' }} />
          ) : (
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 12px 48px rgba(0,0,0,0.35))' }} aria-hidden>
              <polygon points="50,8 94,92 6,92" fill={fill} />
            </svg>
          )}
        </div>
      </div>
    );
  }

  if (type === 'gonogo_action') {
    const kind = content?.kind as string | undefined;
    if (kind === 'arrow') {
      const arrowId = content?.arrowId as string | undefined;
      const rot = arrowId === 'up' ? 0 : arrowId === 'right' ? 90 : arrowId === 'down' ? 180 : -90;
      return (
        <div key={animKey} className="signal-blink" style={C}>
          <svg
            viewBox="0 0 100 130"
            preserveAspectRatio="xMidYMid meet"
            style={{
              width: 'clamp(9rem, 58vmin, min(98vw, 98vh))',
              height: 'clamp(9rem, 58vmin, min(98vw, 98vh))',
              filter: 'drop-shadow(0 10px 48px rgba(0,0,0,0.5))',
            }}
            aria-hidden
          >
            <g transform={`rotate(${rot} 50 67)`}>
              <path
                d="M 50 8 L 88 62 L 62 62 L 62 122 L 38 122 L 38 62 L 12 62 Z"
                fill="#FFFFFF"
                stroke="rgba(255,255,255,0.26)"
                strokeWidth={5}
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </div>
      );
    }
    return (
      <div key={animKey} className="signal-blink" style={{ ...C, flexDirection: 'column', gap: '0.35rem' }}>
        <div
          style={{
            fontSize: 'clamp(100px, 28vw, 300px)',
            lineHeight: 1,
            fontWeight: 900,
            color: '#F87171',
            textShadow: '0 6px 40px rgba(0,0,0,0.45)',
            userSelect: 'none',
          }}
        >
          ✕
        </div>
        <div style={{ fontSize: 'clamp(22px,5vw,40px)', color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>멈춤</div>
      </div>
    );
  }

  if (type === 'gonogo_dual') {
    const shape = content?.shape as 'circle' | 'triangle' | undefined;
    const fill = '#FFFFFF';
    const box = 'min(48vmin, 72vw)';
    return (
      <div key={animKey} className="signal-blink" style={C}>
        <div
          style={{
            width: box,
            height: box,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          {shape === 'circle' ? (
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: fill, boxShadow: '0 12px 48px rgba(0,0,0,0.25)' }} />
          ) : (
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 12px 48px rgba(0,0,0,0.25))' }} aria-hidden>
              <polygon points="50,8 94,92 6,92" fill={fill} />
            </svg>
          )}
        </div>
      </div>
    );
  }

  if (type === 'arrow')
    return (
      <div key={animKey} className="signal-blink" style={{ ...C, flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontSize: 'clamp(110px,26vw,280px)', color: '#fff', lineHeight: 1, fontWeight: 900, textShadow: '0 4px 50px rgba(0,0,0,0.4)' }}>{content?.icon as string}</div>
        <div style={{ fontSize: 'clamp(28px,6vw,56px)', color: 'rgba(255,255,255,0.75)', fontWeight: 700, letterSpacing: '0.05em' }}>{content?.label as string}</div>
      </div>
    );

  if (type === 'basic_variant_color') {
    const panels = (content?.panels as VariantPanelContent[] | undefined) ?? [];
    const pad = 'clamp(12px, 2.5vw, 40px)';
    const outer: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'stretch',
      justifyContent: 'stretch',
      background: '#0F172A',
      padding: pad,
      gap: 3,
      boxSizing: 'border-box',
    };

    /* 1단계: 3패널 모두 과일. 2단계: 3패널 중 1~3칸만 과일(나머지 흰 빈 칸). 3단계: 2패널 각 1장. 패널당 이미지 1장만, 스택 없음 */
    return (
      <div key={animKey} className="signal-blink" style={outer}>
        {panels.map((panel, idx) => {
          const cells = variantCells(panel);
          const slide = cells[0];
          return (
            <div
              key={idx}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                height: '100%',
                background: slide ? '#000' : '#fff',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {slide ? <VariantFruitImg slide={slide} /> : null}
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
    const pageBg = (signal.bg as string) ?? '#FFFFFF';
    const lightPage =
      pageBg === '#FFFFFF' ||
      pageBg.toLowerCase() === '#fff' ||
      pageBg === '#FACC15' ||
      (pageBg.startsWith('#') &&
        (() => {
          const h = pageBg.slice(1);
          if (h.length !== 6) return false;
          const R = parseInt(h.slice(0, 2), 16);
          const G = parseInt(h.slice(2, 4), 16);
          const B = parseInt(h.slice(4, 6), 16);
          return (0.299 * R + 0.587 * G + 0.114 * B) / 255 > 0.55;
        })());
    const strokeCol = lightPage ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.22)';
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
            filter: lightPage ? 'drop-shadow(0 8px 32px rgba(0,0,0,0.12))' : 'drop-shadow(0 10px 48px rgba(0,0,0,0.5))',
          }}
          aria-hidden
        >
          {/* 꼬리(몸통)를 viewBox 세로 확장으로 실제로 길게: 머리·날개는 유지, 몸통만 아래로 연장 */}
          <g transform={`rotate(${rot} 50 67)`}>
            <path
              d="M 50 8 L 88 62 L 62 62 L 62 122 L 38 122 L 38 62 L 12 62 Z"
              fill={fillHex}
              stroke={strokeCol}
              strokeWidth={1}
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>
    );
  }

  if (type === 'stroop') {
    const pageBg = (signal.bg as string) ?? '#FFFFFF';
    const light =
      pageBg === '#FFFFFF' ||
      pageBg.toLowerCase() === '#fff' ||
      (pageBg.startsWith('#') &&
        (() => {
          const h = pageBg.slice(1);
          if (h.length !== 6) return false;
          const R = parseInt(h.slice(0, 2), 16);
          const G = parseInt(h.slice(2, 4), 16);
          const B = parseInt(h.slice(4, 6), 16);
          return (0.299 * R + 0.587 * G + 0.114 * B) / 255 > 0.55;
        })());
    return (
      <div key={animKey} className="signal-blink" style={C}>
        <div
          style={{
            fontSize: 'clamp(80px,20vw,260px)',
            fontWeight: 900,
            color: content?.textHex as string,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            textAlign: 'center',
            textShadow: light ? '0 1px 3px rgba(0,0,0,0.18)' : '0 0 80px rgba(0,0,0,0.6)',
          }}
        >
          {content?.word as string}
        </div>
      </div>
    );
  }

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

  if (type === 'task_switch') {
    const cueTier = typeof content?.cueTier === 'number' ? content.cueTier : 1;
    const rule = (content?.rule as string) ?? 'color';
    const stimulusKind = (content?.stimulusKind as string) ?? 'color';
    const ruleTextK = rule === 'color' ? '색' : rule === 'position' ? '위치' : '반대로';
    const frameTier3: React.CSSProperties =
      cueTier === 3
        ? rule === 'color'
          ? { border: '21px solid rgba(255,255,255,0.94)', borderRadius: '1.35rem', boxSizing: 'border-box' as const }
          : rule === 'position'
            ? { border: '21px dashed rgba(255,255,255,0.9)', borderRadius: '1.35rem', boxSizing: 'border-box' as const }
            : { border: '36px double rgba(255,255,255,0.92)', borderRadius: '1.35rem', boxSizing: 'border-box' as const }
        : {};
    const stimulus =
      stimulusKind === 'color' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', userSelect: 'none' }}>
          <div style={{ fontSize: 'clamp(80px,18vw,180px)', lineHeight: 1, color: content?.textColor as string, opacity: 0.35 }}>{content?.symbol as string}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 'clamp(120px, 30vw, 320px)', color: '#fff', lineHeight: 1, fontWeight: 900, textShadow: '0 4px 50px rgba(0,0,0,0.4)' }}>{content?.icon as string}</div>
        </div>
      );
    return (
      <div
        key={animKey}
        className="signal-blink"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          padding: 'clamp(8px, 2vw, 20px)',
          boxSizing: 'border-box',
        }}
      >
        {cueTier === 1 && (
          <div
            style={{
              textAlign: 'center',
              padding: '0.6rem 0 1rem',
              fontSize: 'clamp(4.8rem, 19vw, 8.2rem)',
              fontWeight: 900,
              color: 'rgba(255,255,255,0.98)',
              textShadow: '0 3px 18px rgba(0,0,0,0.45)',
              letterSpacing: '0.14em',
            }}
          >
            {ruleTextK}
          </div>
        )}
        {cueTier === 2 && (
          <div style={{ textAlign: 'center', padding: '0.35rem 0 0.75rem', fontSize: 'clamp(9rem, 33vw, 15rem)', lineHeight: 1 }}>
            {rule === 'color' ? '🎨' : rule === 'position' ? '📍' : '⇄'}
          </div>
        )}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: cueTier === 3 ? 'clamp(10px, 2vmin, 20px)' : 0,
            ...frameTier3,
          }}
        >
          {stimulus}
        </div>
      </div>
    );
  }

  if (type === 'flanker_row') {
    const circles = (content?.circles as { bg: string; id: string }[] | undefined) ?? [];
    const sizeMultsRaw = content?.sizeMults as number[] | undefined;
    const hasVariedSizes =
      Array.isArray(sizeMultsRaw) &&
      sizeMultsRaw.length === circles.length &&
      sizeMultsRaw.length > 0;
    /** 4번: grow 비율로 크기 차등. 1~3번: 균등. %·vmin 혼합 calc는 부모 너비 미확정 시 0이 되어 원이 안 보일 수 있어 사용하지 않음 */
    const mults = hasVariedSizes
      ? sizeMultsRaw!.map((m) => Math.max(0.35, m))
      : circles.map(() => 1);
    const gap = hasVariedSizes ? 'clamp(0px, 0.18vmin, 2px)' : 'clamp(6px, 1.5vmin, 14px)';
    return (
      <div
        key={animKey}
        className="signal-blink"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: hasVariedSizes ? 'clamp(0px, 0.2vw, 3px)' : 'clamp(8px, 2vw, 20px)',
          boxSizing: 'border-box',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'nowrap',
            gap,
            boxSizing: 'border-box',
          }}
        >
          {circles.map((cell, i) => (
            <div
              key={i}
              style={{
                flex: hasVariedSizes && circles.length === 3 ? '0 0 auto' : `${mults[i] ?? 1} 1 0`,
                width:
                  hasVariedSizes && circles.length === 3
                    ? `min(${(mults[i] ?? 1) * 58}vmin, ${(mults[i] ?? 1) * 58}vw)`
                    : hasVariedSizes && circles.length === 5
                      ? `min(${(mults[i] ?? 1) * 52}vmin, ${(mults[i] ?? 1) * 52}vw)`
                    : undefined,
                minWidth:
                  hasVariedSizes && circles.length === 3
                    ? `min(${(mults[i] ?? 1) * 12}vmin, ${(mults[i] ?? 1) * 12}vw)`
                    : hasVariedSizes && circles.length === 5
                      ? `min(${(mults[i] ?? 1) * 12}vmin, ${(mults[i] ?? 1) * 12}vw)`
                    : 'clamp(6px, 2.2vmin, 28px)',
                maxWidth:
                  hasVariedSizes && circles.length === 3
                    ? `min(${(mults[i] ?? 1) * 58}vmin, ${(mults[i] ?? 1) * 58}vw)`
                    : hasVariedSizes && circles.length === 5
                      ? `min(${(mults[i] ?? 1) * 52}vmin, ${(mults[i] ?? 1) * 52}vw)`
                    : hasVariedSizes
                      ? 'min(38vmin, 46vw)'
                      : 'min(30vmin, 24vw)',
                aspectRatio: '1',
                flexShrink: 1,
                borderRadius: '50%',
                background: cell.bg,
                boxSizing: 'border-box',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'simon_arrow') {
    const posX = typeof content?.posX === 'number' ? content.posX : 0.5;
    const posY = typeof content?.posY === 'number' ? content.posY : 0.5;
    const arrowId = content?.arrowId as string | undefined;
    const rot = arrowId === 'up' ? 0 : arrowId === 'right' ? 90 : arrowId === 'down' ? 180 : -90;
    return (
      <div key={animKey} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div
          className="signal-blink"
          style={{
            position: 'absolute',
            left: `${posX * 100}%`,
            top: `${posY * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: 'min(44vw, 44vh)',
            height: 'min(44vw, 44vh)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          <svg
            viewBox="0 0 100 130"
            preserveAspectRatio="xMidYMid meet"
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              filter: 'drop-shadow(0 8px 44px rgba(0,0,0,0.45))',
            }}
            aria-hidden
          >
            <g transform={`rotate(${rot} 50 67)`}>
              <path
                d="M 50 8 L 88 62 L 62 62 L 62 122 L 38 122 L 38 62 L 12 62 Z"
                fill="#FFFFFF"
                stroke="rgba(255,255,255,0.24)"
                strokeWidth={6}
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </div>
      </div>
    );
  }

  if (type === 'simon_shape') {
    const shape = content?.shape as 'circle' | 'triangle' | 'square' | undefined;
    const fillHex = (content?.fillHex as string) ?? '#EF4444';
    const posX = typeof content?.posX === 'number' ? content.posX : 0.5;
    const posY = typeof content?.posY === 'number' ? content.posY : 0.5;
    const size = 'min(25vw, 25vh)';
    const common: React.CSSProperties = {
      width: '100%',
      height: '100%',
      background: fillHex,
      flexShrink: 0,
    };
    return (
      <div key={animKey} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div
          className="signal-blink"
          style={{
            position: 'absolute',
            left: `${posX * 100}%`,
            top: `${posY * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          {shape === 'circle' ? (
            <div style={{ ...common, borderRadius: '50%' }} />
          ) : shape === 'square' ? (
            <div style={{ ...common, borderRadius: '6%' }} />
          ) : (
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden>
              <polygon points="50,6 94,94 6,94" fill={fillHex} />
            </svg>
          )}
        </div>
      </div>
    );
  }

  return null;
});
