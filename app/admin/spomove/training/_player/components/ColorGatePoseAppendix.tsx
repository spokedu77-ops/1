'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  COLOR_GATE_POSE_DEFINITIONS,
  type ColorGateCategory,
} from '../flow-lab/engine/modules/colorGateGuides';

const GROUPS: ReadonlyArray<{ id: ColorGateCategory; label: string }> = [
  { id: 'strength', label: '근력·근지구력' },
  { id: 'flexibility', label: '유연성' },
  { id: 'balance', label: '평형성' },
  { id: 'power-jump', label: '순발력·민첩성' },
  { id: 'partner', label: '투게더' },
];

export function ColorGatePoseAppendix() {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<ColorGateCategory>('strength');
  const poses = COLOR_GATE_POSE_DEFINITIONS.filter((pose) => pose.category === activeGroup);

  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '11px 14px', borderRadius: 12,
          border: `1.5px solid ${open ? '#38BDF8' : 'var(--border, #CBD5E1)'}`,
          background: open ? 'rgba(56,189,248,0.10)' : 'var(--card, #fff)',
          color: 'var(--text, #0F172A)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 900 }}>📎 (부록) 모션 게이트 동작 소개</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted, #64748B)', fontWeight: 700 }}>
          {open ? '▲ 닫기' : '▼ 열기'}
        </span>
      </button>

      {open ? (
        <div style={{ marginTop: 7, overflow: 'hidden', border: '1px solid var(--border, #E2E8F0)', borderRadius: 14, background: 'var(--card, #fff)' }}>
          <div style={{ padding: '16px 16px 12px', textAlign: 'center', borderBottom: '1px solid var(--border, #E2E8F0)' }}>
            <div style={{ fontSize: 20, fontWeight: 950, color: 'var(--text, #0F172A)' }}>모션 게이트 동작 종합 분류표</div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted, #64748B)', fontWeight: 700 }}>
              4개 유형 × 쉬움·어려움 각 5개 · 투게더 3개
            </div>
          </div>

          <div role="tablist" aria-label="모션 게이트 동작 유형" style={{ display: 'flex', gap: 6, padding: 10, overflowX: 'auto', background: 'var(--subtle-bg, #F8FAFC)' }}>
            {GROUPS.map((group) => {
              const active = activeGroup === group.id;
              return (
                <button key={group.id} type="button" role="tab" aria-selected={active} onClick={() => setActiveGroup(group.id)}
                  style={{ flex: '1 0 auto', padding: '8px 10px', borderRadius: 9, border: `1.5px solid ${active ? '#38BDF8' : 'var(--border, #CBD5E1)'}`, background: active ? 'rgba(56,189,248,0.12)' : 'var(--card, #fff)', color: active ? '#0284C7' : 'var(--text-muted, #64748B)', fontSize: 12, fontWeight: 850, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {group.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: 8, padding: 12 }}>
            {poses.map((pose, index) => (
              <div key={pose.key} style={{ overflow: 'hidden', border: '1px solid var(--border, #E2E8F0)', borderRadius: 10, background: 'var(--subtle-bg, #F8FAFC)' }}>
                <div style={{ position: 'relative', aspectRatio: '4 / 5', background: '#fff' }}>
                  <Image src={pose.image} alt={`${pose.label} 동작`} fill sizes="(max-width: 640px) 22vw, 120px" style={{ objectFit: 'contain', padding: 5 }} />
                  <span style={{ position: 'absolute', top: 5, left: 5, minWidth: 20, height: 20, padding: '0 4px', borderRadius: 6, background: '#0F172A', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 900 }}>
                    {index + 1}
                  </span>
                  {activeGroup !== 'partner' ? (
                    <span style={{ position: 'absolute', top: 5, right: 5, padding: '3px 5px', borderRadius: 5, background: pose.difficulty === 'easy' ? '#DCFCE7' : '#FEE2E2', color: pose.difficulty === 'easy' ? '#15803D' : '#B91C1C', fontSize: 9, fontWeight: 900 }}>
                      {pose.difficulty === 'easy' ? '쉬움' : '어려움'}
                    </span>
                  ) : null}
                </div>
                <div style={{ minHeight: 42, padding: '8px 5px', display: 'grid', placeItems: 'center', textAlign: 'center', color: 'var(--text, #0F172A)', fontSize: 11, lineHeight: 1.25, fontWeight: 800 }}>
                  {pose.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
