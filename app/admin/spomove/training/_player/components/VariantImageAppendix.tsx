'use client';

import React, { useState } from 'react';
import { useSpomoveVariantSlidesForTraining } from '../hooks/useSpomoveVariantFruitSlidesForTraining';
import {
  SPOMOVE_COLOR_THEME_LABELS,
  SPOMOVE_THEMED_PACK_BY_THEME,
  type SpomoveColorThemeId,
} from '../lib/spomoveVariantThemeConfig';
import { VARIANT_FRUIT_SLOT_LABELS } from '../lib/variantFruitAssets';

type AppendixTheme = Exclude<SpomoveColorThemeId, 'color'>;

const APPENDIX_THEMES: AppendixTheme[] = ['fruit', 'vehicle', 'emotion', 'animal', 'nature'];

function getSlotLabels(theme: AppendixTheme): readonly string[] {
  if (theme === 'fruit') return VARIANT_FRUIT_SLOT_LABELS;
  return SPOMOVE_THEMED_PACK_BY_THEME[theme].slotLabels;
}

function CategorySlides({ theme }: { theme: AppendixTheme }) {
  const { slides, status } = useSpomoveVariantSlidesForTraining(theme);
  const slotLabels = getSlotLabels(theme);

  if (status === 'loading') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '0.85rem' }}>
        로딩 중...
      </div>
    );
  }

  const items = slotLabels
    .map((label, i) => ({ label, imageUrl: (slides[i]?.imageUrl ?? '').trim() }))
    .filter((item) => item.imageUrl);

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '0.85rem' }}>
        업로드된 이미지가 없습니다.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.75rem',
      }}
    >
      {items.map(({ label, imageUrl }) => (
        <div
          key={label}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <div
            style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: '0.65rem',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
              <img
              src={imageUrl}
              alt={label}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#475569',
              textAlign: 'center',
              lineHeight: 1.3,
            }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function VariantImageGallery() {
  const [activeTheme, setActiveTheme] = useState<AppendixTheme>('fruit');

  return (
    <div style={{ marginTop: '0.85rem' }}>
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border, #E2E8F0)',
          overflowX: 'auto',
        }}
      >
        {APPENDIX_THEMES.map((theme) => (
          <button
            key={theme}
            type="button"
            onClick={() => setActiveTheme(theme)}
            style={{
              padding: '0.55rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: activeTheme === theme ? 800 : 600,
              color: activeTheme === theme ? '#3B82F6' : 'var(--text-muted, #64748B)',
              background: 'transparent',
              border: 'none',
              borderBottom:
                activeTheme === theme ? '2px solid #3B82F6' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              fontFamily: 'inherit',
            }}
          >
            {SPOMOVE_COLOR_THEME_LABELS[theme]}
          </button>
        ))}
      </div>
      <div style={{ paddingTop: '0.85rem' }}>
        <CategorySlides theme={activeTheme} />
      </div>
    </div>
  );
}

export function VariantImageAppendix() {
  const [open, setOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState<AppendixTheme>('fruit');

  return (
    <div style={{ marginTop: '0.85rem' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.7rem 1rem',
          borderRadius: '0.75rem',
          border: '1px solid #CBD5E1',
          background: open ? '#F1F5F9' : '#fff',
          cursor: 'pointer',
          fontSize: '0.86rem',
          fontWeight: 800,
          color: '#0F172A',
          textAlign: 'left',
        }}
      >
        <span>📎 부록 · 변형 색지각 이미지 소개</span>
        <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
          {open ? '▲ 닫기' : '▼ 열기'}
        </span>
      </button>

      {open && (
        <div
          style={{
            marginTop: '0.45rem',
            border: '1px solid #E2E8F0',
            borderRadius: '0.85rem',
            overflow: 'hidden',
            background: '#fff',
          }}
        >
          {/* 탭 */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC',
              overflowX: 'auto',
            }}
          >
            {APPENDIX_THEMES.map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => setActiveTheme(theme)}
                style={{
                  padding: '0.6rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: activeTheme === theme ? 800 : 600,
                  color: activeTheme === theme ? '#3B82F6' : '#64748B',
                  background: 'transparent',
                  border: 'none',
                  borderBottom:
                    activeTheme === theme
                      ? '2px solid #3B82F6'
                      : '2px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {SPOMOVE_COLOR_THEME_LABELS[theme]}
              </button>
            ))}
          </div>

          {/* 이미지 그리드 */}
          <div style={{ padding: '1rem' }}>
            <CategorySlides theme={activeTheme} />
          </div>
        </div>
      )}
    </div>
  );
}
