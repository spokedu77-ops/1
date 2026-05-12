'use client';

import React from 'react';
import { SPEED_PRESETS } from '../constants';

export function SpeedSelector({
  value,
  onChange,
  showPresets = true,
}: {
  value: number;
  onChange: (v: number) => void;
  showPresets?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {showPresets && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.4rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
            {SPEED_PRESETS.slice(0, 3).map((p) => {
              const active = value === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => onChange(p.value)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.65rem 0.4rem',
                    borderRadius: '0.85rem',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    border: `2px solid ${active ? p.color : '#E2E8F0'}`,
                    background: active ? `${p.color}12` : '#fff',
                    transition: 'all 0.14s',
                    gap: '0.18rem',
                  }}
                >
                  <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{p.emoji}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: active ? p.color : '#334155', lineHeight: 1.2, textAlign: 'center' }}>{p.label}</span>
                  <span style={{ fontSize: '0.63rem', color: active ? p.color : '#94A3B8', fontWeight: 500 }}>{p.sub}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: active ? p.color : '#64748B', marginTop: '0.1rem' }}>{p.value}초</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem', maxWidth: '66.6%', margin: '0 auto', width: '100%' }}>
            {SPEED_PRESETS.slice(3).map((p) => {
              const active = value === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => onChange(p.value)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.65rem 0.4rem',
                    borderRadius: '0.85rem',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    border: `2px solid ${active ? p.color : '#E2E8F0'}`,
                    background: active ? `${p.color}12` : '#fff',
                    transition: 'all 0.14s',
                    gap: '0.18rem',
                  }}
                >
                  <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{p.emoji}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: active ? p.color : '#334155', lineHeight: 1.2, textAlign: 'center' }}>{p.label}</span>
                  <span style={{ fontSize: '0.63rem', color: active ? p.color : '#94A3B8', fontWeight: 500 }}>{p.sub}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: active ? p.color : '#64748B', marginTop: '0.1rem' }}>{p.value}초</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ background: 'var(--subtle-bg)', borderRadius: '0.85rem', padding: '0.75rem 1rem', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>직접 조절</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#F97316' }}>{value.toFixed(1)}초</span>
        </div>
        <input
          type="range"
          min={1.0}
          max={6.0}
          step={0.5}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#F97316' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--range-tick)', fontWeight: 600, marginTop: '0.35rem' }}>
          <span>← 빠름 (1초)</span>
          <span>느림 (6초) →</span>
        </div>
      </div>
    </div>
  );
}
