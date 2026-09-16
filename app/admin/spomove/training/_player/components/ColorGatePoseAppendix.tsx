'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  COLOR_GATE_POSE_DEFINITIONS,
  type ColorGateCategory,
  type ColorGateDifficulty,
} from '../flow-lab/engine/modules/colorGateGuides';

type PoseGroup = 'all' | ColorGateCategory;
type PoseFilter = 'all' | ColorGateDifficulty;

const GROUPS: ReadonlyArray<{ id: PoseGroup; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'strength', label: '근력·근지구력' },
  { id: 'flexibility', label: '유연성' },
  { id: 'balance', label: '평형성' },
  { id: 'power-jump', label: '순발력·민첩성' },
  { id: 'partner', label: '투게더' },
];

function PoseCatalog({ fullscreen }: { fullscreen: boolean }) {
  const [activeGroup, setActiveGroup] = useState<PoseGroup>('all');
  const [activeFilter, setActiveFilter] = useState<PoseFilter>('all');
  const isTogether = activeGroup === 'partner';
  const filters: ReadonlyArray<{ id: PoseFilter; label: string }> = isTogether
    ? [{ id: 'easy', label: '쉬움' }, { id: 'all', label: '전체' }]
    : [{ id: 'all', label: '전체' }, { id: 'easy', label: '쉬움' }, { id: 'hard', label: '어려움' }];
  const poses = COLOR_GATE_POSE_DEFINITIONS.filter((pose) => {
    if (activeGroup !== 'all' && pose.category !== activeGroup) return false;
    if (isTogether) {
      return activeFilter === 'all' || COLOR_GATE_POSE_DEFINITIONS
        .filter((item) => item.category === 'partner')
        .slice(0, 5)
        .some((item) => item.key === pose.key);
    }
    return activeFilter === 'all' || pose.difficulty === activeFilter;
  });

  const selectGroup = (group: PoseGroup) => {
    setActiveGroup(group);
    setActiveFilter(group === 'partner' ? 'easy' : 'all');
  };

  return (
    <div style={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column' }}>
      <div
        role="tablist"
        aria-label="모션 게이트 동작 유형"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: fullscreen ? 10 : 6,
          padding: fullscreen ? '16px clamp(16px, 4vw, 40px)' : 10,
          background: 'var(--subtle-bg, #F8FAFC)',
        }}
      >
        {GROUPS.map((group) => {
          const active = activeGroup === group.id;
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectGroup(group.id)}
              style={{
                minHeight: fullscreen ? 52 : 44,
                padding: fullscreen ? '10px 12px' : '8px 6px',
                borderRadius: 10,
                border: `1.5px solid ${active ? '#38BDF8' : 'var(--border, #CBD5E1)'}`,
                background: active ? 'rgba(56,189,248,0.12)' : 'var(--card, #fff)',
                color: active ? '#0284C7' : 'var(--text-muted, #64748B)',
                fontSize: fullscreen ? 16 : 12,
                lineHeight: 1.25,
                fontWeight: 850,
                cursor: 'pointer',
                fontFamily: 'inherit',
                wordBreak: 'keep-all',
              }}
            >
              {group.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: fullscreen ? '4px 16px 14px' : '2px 10px 10px', background: 'var(--subtle-bg, #F8FAFC)' }}>
        {filters.map((filter) => {
          const active = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveFilter(filter.id)}
              style={{
                minWidth: fullscreen ? 92 : 70,
                minHeight: 36,
                padding: '6px 14px',
                borderRadius: 999,
                border: `1px solid ${active ? '#0F172A' : 'var(--border, #CBD5E1)'}`,
                background: active ? '#0F172A' : '#fff',
                color: active ? '#fff' : '#475569',
                fontSize: fullscreen ? 14 : 12,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: fullscreen ? 'repeat(auto-fit, minmax(150px, 1fr))' : 'repeat(auto-fit, minmax(92px, 1fr))', gap: fullscreen ? 14 : 8, padding: fullscreen ? '16px clamp(16px, 4vw, 40px) 32px' : 12 }}>
        {poses.map((pose, index) => (
          <div key={pose.key} style={{ overflow: 'hidden', border: '1px solid var(--border, #E2E8F0)', borderRadius: fullscreen ? 14 : 10, background: 'var(--subtle-bg, #F8FAFC)' }}>
            <div style={{ position: 'relative', aspectRatio: '4 / 5', background: '#fff' }}>
              <Image src={pose.image} alt={`${pose.label} 동작`} fill sizes={fullscreen ? '(max-width: 640px) 45vw, 190px' : '(max-width: 640px) 22vw, 120px'} style={{ objectFit: 'contain', padding: fullscreen ? 9 : 5 }} />
              <span style={{ position: 'absolute', top: 7, left: 7, minWidth: fullscreen ? 28 : 20, height: fullscreen ? 28 : 20, padding: '0 5px', borderRadius: 7, background: '#0F172A', color: '#fff', display: 'grid', placeItems: 'center', fontSize: fullscreen ? 14 : 11, fontWeight: 900 }}>
                {index + 1}
              </span>
              {pose.category !== 'partner' ? (
                <span style={{ position: 'absolute', top: 7, right: 7, padding: fullscreen ? '5px 8px' : '3px 5px', borderRadius: 6, background: pose.difficulty === 'easy' ? '#DCFCE7' : '#FEE2E2', color: pose.difficulty === 'easy' ? '#15803D' : '#B91C1C', fontSize: fullscreen ? 12 : 9, fontWeight: 900 }}>
                  {pose.difficulty === 'easy' ? '쉬움' : '어려움'}
                </span>
              ) : null}
            </div>
            <div style={{ minHeight: fullscreen ? 54 : 42, padding: fullscreen ? '10px 8px' : '8px 5px', display: 'grid', placeItems: 'center', textAlign: 'center', color: 'var(--text, #0F172A)', fontSize: fullscreen ? 15 : 11, lineHeight: 1.3, fontWeight: 800 }}>
              {pose.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FullscreenCatalog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="모션 게이트 동작 종합 분류표" style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', color: '#0F172A' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px clamp(16px, 4vw, 40px)', borderBottom: '1px solid #E2E8F0' }}>
        <div>
          <div style={{ fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 950 }}>모션 게이트 동작 종합 분류표</div>
          <div style={{ marginTop: 3, color: '#64748B', fontSize: 13, fontWeight: 700 }}>4개 유형 × 쉬움·어려움 각 5개 · 투게더 10개</div>
        </div>
        <button type="button" onClick={onClose} aria-label="전체 화면 닫기" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, border: '1px solid #CBD5E1', background: '#fff', color: '#0F172A', fontSize: 28, lineHeight: 1, cursor: 'pointer' }}>×</button>
      </div>
      <PoseCatalog fullscreen />
    </div>,
    document.body,
  );
}

export function ColorGatePoseAppendix() {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div style={{ marginTop: 8 }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${open ? '#38BDF8' : '#CBD5E1'}`, background: open ? '#ECFEFF' : '#fff', color: '#0F172A', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
        <span style={{ fontSize: 13, fontWeight: 900 }}>📎 (부록) 모션 게이트 동작 소개</span>
        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>{open ? '▲ 닫기' : '▼ 열기'}</span>
      </button>

      {open ? (
        <div style={{ marginTop: 7, overflow: 'hidden', border: '1px solid var(--border, #E2E8F0)', borderRadius: 14, background: 'var(--card, #fff)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 14px 12px', borderBottom: '1px solid var(--border, #E2E8F0)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 950, color: 'var(--text, #0F172A)', wordBreak: 'keep-all' }}>모션 게이트 동작 종합 분류표</div>
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted, #64748B)', fontWeight: 700 }}>4개 유형 × 쉬움·어려움 각 5개 · 투게더 10개</div>
            </div>
            <button type="button" onClick={() => setFullscreen(true)} style={{ minHeight: 40, flexShrink: 0, padding: '8px 11px', borderRadius: 9, border: '1px solid #CBD5E1', background: '#fff', color: '#0F172A', fontSize: 12, fontWeight: 850, cursor: 'pointer', fontFamily: 'inherit' }}>⛶ 전체 화면</button>
          </div>
          <PoseCatalog fullscreen={false} />
        </div>
      ) : null}

      {fullscreen ? <FullscreenCatalog onClose={() => setFullscreen(false)} /> : null}
    </div>
  );
}
