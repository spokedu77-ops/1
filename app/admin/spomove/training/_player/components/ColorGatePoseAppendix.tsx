'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useViewportScrollLock } from '../lib/lockViewportScroll';
import {
  COLOR_GATE_POSE_DEFINITIONS,
  type ColorGateCategory,
  type ColorGateDifficulty,
} from '../flow-lab/engine/modules/colorGateGuides';

type PoseGroup = 'all' | ColorGateCategory;
type PoseFilter = 'all' | ColorGateDifficulty | 'family';
type CatalogPose = (typeof COLOR_GATE_POSE_DEFINITIONS)[number];

const GROUPS: ReadonlyArray<{ id: PoseGroup; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'strength', label: '근력·근지구력' },
  { id: 'flexibility', label: '유연성' },
  { id: 'balance', label: '평형성' },
  { id: 'power-jump', label: '순발력·민첩성' },
  { id: 'partner', label: '투게더' },
];

function PoseImageViewer({
  poses,
  activeIndex,
  onChange,
  onClose,
}: {
  poses: ReadonlyArray<{ pose: CatalogPose; number: number }>;
  activeIndex: number;
  onChange: (index: number) => void;
  onClose: () => void;
}) {
  const active = poses[activeIndex];
  useViewportScrollLock(true);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!['Escape', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onChange((activeIndex - 1 + poses.length) % poses.length);
      if (event.key === 'ArrowRight') onChange((activeIndex + 1) % poses.length);
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [activeIndex, onChange, onClose, poses.length]);

  if (!active) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${active.pose.label} 이미지`} style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) auto', background: '#fff', color: '#0F172A' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px clamp(16px, 4vw, 40px)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'clamp(18px, 3vw, 28px)', fontWeight: 800, wordBreak: 'keep-all' }}>{active.pose.label}</div>
          <div style={{ marginTop: 3, color: '#64748B', fontSize: 13, fontWeight: 700 }}>{activeIndex + 1} / {poses.length}</div>
        </div>
        <button type="button" onClick={onClose} aria-label="이미지 닫기" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, border: '1px solid #CBD5E1', background: '#fff', color: '#0F172A', fontSize: 28, lineHeight: 1, cursor: 'pointer' }}>×</button>
      </div>
      <div style={{ position: 'relative', minHeight: 0, margin: '0 clamp(58px, 8vw, 104px)' }}>
        <Image src={active.pose.image} alt={`${active.pose.label} 동작`} fill unoptimized sizes="100vw" style={{ objectFit: 'contain', padding: 'clamp(8px, 2vw, 24px)' }} priority />
        <button type="button" onClick={() => onChange((activeIndex - 1 + poses.length) % poses.length)} aria-label="이전 동작" style={{ position: 'fixed', left: 12, top: '50%', width: 48, height: 56, transform: 'translateY(-50%)', borderRadius: 12, border: '1px solid #CBD5E1', background: 'rgba(255,255,255,0.92)', color: '#0F172A', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', fontSize: 30, cursor: 'pointer' }}>‹</button>
        <button type="button" onClick={() => onChange((activeIndex + 1) % poses.length)} aria-label="다음 동작" style={{ position: 'fixed', right: 12, top: '50%', width: 48, height: 56, transform: 'translateY(-50%)', borderRadius: 12, border: '1px solid #CBD5E1', background: 'rgba(255,255,255,0.92)', color: '#0F172A', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', fontSize: 30, cursor: 'pointer' }}>›</button>
      </div>
      <div style={{ padding: '10px 16px max(14px, env(safe-area-inset-bottom))', color: '#64748B', textAlign: 'center', fontSize: 13, fontWeight: 700 }}>← → 키로 이동 · Esc로 닫기</div>
    </div>,
    document.body,
  );
}

function PoseCatalog({ fullscreen }: { fullscreen: boolean }) {
  const [activeGroup, setActiveGroup] = useState<PoseGroup>('all');
  const [activeFilter, setActiveFilter] = useState<PoseFilter>('all');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const filters: ReadonlyArray<{ id: PoseFilter; label: string }> = [
    { id: 'all', label: '전체' },
    { id: 'easy', label: '쉬움' },
    { id: 'hard', label: '어려움' },
    ...(activeGroup === 'partner' ? [{ id: 'family' as const, label: '가족' }] : []),
  ];
  const poses = COLOR_GATE_POSE_DEFINITIONS
    .map((pose, index) => ({ pose, number: index + 1 }))
    .filter(({ pose }) => {
      if (activeGroup !== 'all' && pose.category !== activeGroup) return false;
      if (pose.difficulty === 'family') return activeGroup === 'partner' && activeFilter === 'family';
      if (activeFilter === 'family') return false;
      return activeFilter === 'all' || pose.difficulty === activeFilter;
    })
    .map((item, index) => ({
      ...item,
      number: activeFilter === 'family' ? index + 1 : item.number,
    }));

  const selectGroup = (group: PoseGroup) => {
    setActiveGroup(group);
    setActiveFilter('all');
  };

  return (
    <div style={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column' }}>
      <div style={{ padding: fullscreen ? '12px clamp(16px, 4vw, 40px) 8px' : '9px 10px 6px', background: 'var(--subtle-bg, #F8FAFC)' }}>
        <p style={{ margin: '0 0 6px', color: 'var(--text-muted, #64748B)', fontSize: fullscreen ? 13 : 11, fontWeight: 800 }}>카테고리</p>
        <div
          role="tablist"
          aria-label="모션 게이트 동작 유형"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: fullscreen ? 10 : 6,
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
                  minHeight: fullscreen ? 48 : 44,
                  padding: fullscreen ? '8px 12px' : '8px 6px',
                  borderRadius: 10,
                  border: `1.5px solid ${active ? '#38BDF8' : 'var(--border, #CBD5E1)'}`,
                  background: active ? 'rgba(56,189,248,0.12)' : 'var(--card, #fff)',
                  color: active ? '#0284C7' : 'var(--text-muted, #64748B)',
                  fontSize: fullscreen ? 15 : 12,
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
      </div>

      <div style={{ padding: fullscreen ? '2px clamp(16px, 4vw, 40px) 12px' : '2px 10px 9px', background: 'var(--subtle-bg, #F8FAFC)', borderBottom: '1px solid var(--border, #E2E8F0)' }}>
        <p style={{ margin: '0 0 6px', color: 'var(--text-muted, #64748B)', fontSize: fullscreen ? 13 : 11, fontWeight: 800, textAlign: 'center' }}>난이도</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
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
                  minHeight: 44,
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
      </div>

      <div data-color-gate-catalog style={{ minHeight: 0, flex: fullscreen ? '1 1 auto' : undefined, overflowY: 'auto', display: 'grid', gridTemplateColumns: fullscreen ? 'repeat(auto-fit, minmax(150px, 1fr))' : 'repeat(auto-fit, minmax(92px, 1fr))', gridAutoRows: 'max-content', alignItems: 'start', gap: fullscreen ? 14 : 8, padding: fullscreen ? '16px clamp(16px, 4vw, 40px) 32px' : 12 }}>
        {poses.map(({ pose, number }, index) => (
          <button type="button" onClick={() => setViewerIndex(index)} key={pose.key} data-pose-number={number} aria-label={`${pose.label} 크게 보기`} style={{ overflow: 'hidden', padding: 0, border: '1px solid var(--border, #E2E8F0)', borderRadius: fullscreen ? 14 : 10, background: 'var(--subtle-bg, #F8FAFC)', color: 'inherit', cursor: 'zoom-in', fontFamily: 'inherit' }}>
            <div style={{ position: 'relative', aspectRatio: '1 / 1', background: '#fff' }}>
              <Image src={pose.image} alt={`${pose.label} 동작`} fill unoptimized sizes={fullscreen ? '(max-width: 640px) 45vw, 190px' : '(max-width: 640px) 22vw, 120px'} style={{ objectFit: 'contain', padding: fullscreen ? 9 : 5 }} />
              <span style={{ position: 'absolute', top: 7, left: 7, minWidth: fullscreen ? 28 : 20, height: fullscreen ? 28 : 20, padding: '0 5px', borderRadius: 7, background: '#0F172A', color: '#fff', display: 'grid', placeItems: 'center', fontSize: fullscreen ? 14 : 11, fontWeight: 800 }}>
                {number}
              </span>
              <span style={{ position: 'absolute', top: 7, right: 7, padding: fullscreen ? '5px 8px' : '3px 5px', borderRadius: 6, background: pose.difficulty === 'easy' ? '#DCFCE7' : pose.difficulty === 'family' ? '#E0F2FE' : '#FEE2E2', color: pose.difficulty === 'easy' ? '#15803D' : pose.difficulty === 'family' ? '#0369A1' : '#B91C1C', fontSize: fullscreen ? 12 : 9, fontWeight: 800 }}>
                {pose.difficulty === 'easy' ? '쉬움' : pose.difficulty === 'family' ? '가족' : '어려움'}
              </span>
            </div>
            <div style={{ minHeight: fullscreen ? 54 : 42, padding: fullscreen ? '10px 8px' : '8px 5px', display: 'grid', placeItems: 'center', textAlign: 'center', color: 'var(--text, #0F172A)', fontSize: fullscreen ? 15 : 11, lineHeight: 1.3, fontWeight: 800 }}>
              {pose.label}
            </div>
          </button>
        ))}
        {poses.length === 0 ? (
          <p role="status" style={{ gridColumn: '1 / -1', margin: 0, padding: '28px 12px', color: 'var(--text-muted, #64748B)', textAlign: 'center', fontSize: fullscreen ? 15 : 12, fontWeight: 700 }}>
            조건에 맞는 동작이 없습니다.
          </p>
        ) : null}
      </div>
      {viewerIndex !== null ? (
        <PoseImageViewer poses={poses} activeIndex={viewerIndex} onChange={setViewerIndex} onClose={() => setViewerIndex(null)} />
      ) : null}
    </div>
  );
}

function FullscreenCatalog({ onClose }: { onClose: () => void }) {
  useViewportScrollLock(true);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="모션 게이트 동작 종합 분류표" style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', color: '#0F172A' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px clamp(16px, 4vw, 40px)', borderBottom: '1px solid #E2E8F0' }}>
        <div>
          <div style={{ fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 950 }}>모션 게이트 동작 종합 분류표</div>
          <div style={{ marginTop: 3, color: '#64748B', fontSize: 13, fontWeight: 700 }}>4개 유형 × 쉬움·어려움 각 5개 · 투게더 14개 · 가족 9개</div>
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
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} style={{ minHeight: 44, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${open ? '#38BDF8' : '#CBD5E1'}`, background: open ? '#ECFEFF' : '#fff', color: '#0F172A', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>📎 (부록) 모션 게이트 동작 소개</span>
        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>{open ? '▲ 닫기' : '▼ 열기'}</span>
      </button>

      {open ? (
        <div style={{ marginTop: 7, overflow: 'hidden', border: '1px solid var(--border, #E2E8F0)', borderRadius: 14, background: 'var(--card, #fff)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 14px 12px', borderBottom: '1px solid var(--border, #E2E8F0)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 950, color: 'var(--text, #0F172A)', wordBreak: 'keep-all' }}>모션 게이트 동작 종합 분류표</div>
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted, #64748B)', fontWeight: 700 }}>4개 유형 × 쉬움·어려움 각 5개 · 투게더 14개 · 가족 9개</div>
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
