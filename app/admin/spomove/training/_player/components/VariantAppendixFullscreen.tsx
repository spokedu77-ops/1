'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { useSpomoveVariantSlidesForTraining } from '../hooks/useSpomoveVariantFruitSlidesForTraining';
import {
  SPOMOVE_COLOR_THEME_LABELS,
  SPOMOVE_THEMED_PACK_BY_THEME,
  type SpomoveColorThemeId,
} from '../lib/spomoveVariantThemeConfig';
import { VARIANT_FRUIT_SLOT_LABELS, SPOMOVE_VARIANT_PACK_ID } from '../lib/variantFruitAssets';

const BG = '#0b0b0b';
const CARD = '#181818';
const BORDER = 'rgba(255,255,255,0.09)';
const TEXT = 'rgba(255,255,255,0.88)';
const MUTED = 'rgba(255,255,255,0.38)';
const ACCENT = '#3B82F6';

type AppendixTheme = Exclude<SpomoveColorThemeId, 'color'>;
const APPENDIX_THEMES: AppendixTheme[] = ['fruit', 'vehicle', 'emotion', 'animal', 'nature'];

function getDefaultLabels(theme: AppendixTheme): string[] {
  if (theme === 'fruit') return [...VARIANT_FRUIT_SLOT_LABELS];
  return [...SPOMOVE_THEMED_PACK_BY_THEME[theme].slotLabels];
}

function getPackId(theme: AppendixTheme): string {
  if (theme === 'fruit') return SPOMOVE_VARIANT_PACK_ID;
  return SPOMOVE_THEMED_PACK_BY_THEME[theme].packId;
}

async function loadStoredLabels(theme: AppendixTheme): Promise<string[] | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase
    .from('think_asset_packs')
    .select('assets_json')
    .eq('id', getPackId(theme))
    .maybeSingle();
  const raw = data?.assets_json as { slotLabels?: unknown } | null;
  const stored = raw?.slotLabels;
  if (Array.isArray(stored) && stored.length > 0 && stored.every((s) => typeof s === 'string')) {
    return stored as string[];
  }
  return null;
}

async function saveStoredLabels(theme: AppendixTheme, labels: string[]): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const packId = getPackId(theme);
  const { data: existing } = await supabase
    .from('think_asset_packs')
    .select('assets_json')
    .eq('id', packId)
    .maybeSingle();
  const existingJson = (existing?.assets_json ?? {}) as Record<string, unknown>;
  const { error } = await supabase
    .from('think_asset_packs')
    .update({ assets_json: { ...existingJson, slotLabels: labels } })
    .eq('id', packId);
  return error?.message ?? null;
}

function CategoryContent({ theme }: { theme: AppendixTheme }) {
  const { slides, status } = useSpomoveVariantSlidesForTraining(theme);
  const [labels, setLabels] = useState<string[]>(() => getDefaultLabels(theme));
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const defaults = getDefaultLabels(theme);
    setLabels(defaults);
    setEditingIdx(null);
    void loadStoredLabels(theme).then((stored) => {
      if (stored) {
        setLabels(defaults.map((def, i) => stored[i] ?? def));
      }
    });
  }, [theme]);

  const startEdit = (i: number, currentLabel: string) => {
    setEditingIdx(i);
    setEditValue(currentLabel);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    if (editingIdx === null) return;
    const next = [...labels];
    next[editingIdx] = editValue.trim() || (getDefaultLabels(theme)[editingIdx] ?? '');
    setLabels(next);
    setEditingIdx(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    const err = await saveStoredLabels(theme, labels);
    setSaving(false);
    setSaveMsg(err ? `오류: ${err}` : '저장됨 ✓');
    setTimeout(() => setSaveMsg(null), 2500);
  };

  const items = labels
    .map((label, i) => ({ label, imageUrl: (slides[i]?.imageUrl ?? '').trim(), index: i }))
    .filter((item) => item.imageUrl);

  return (
    <>
      {/* 이미지 그리드 — 남은 공간 전부 */}
      <div style={{ flex: 1, minHeight: 0, padding: '1.5rem 2rem 0', overflow: 'hidden' }}>
        {status === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: MUTED, fontSize: '1rem' }}>
            로딩 중…
          </div>
        )}
        {status !== 'loading' && items.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: MUTED, fontSize: '1rem' }}>
            업로드된 이미지가 없습니다.
          </div>
        )}
        {items.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridAutoRows: '1fr',
              gap: '1.5rem',
              height: '100%',
            }}
          >
            {items.map(({ label, imageUrl, index }) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.65rem',
                  minHeight: 0,
                }}
              >
                {/* 이미지 — 셀 높이에서 이름 영역을 뺀 나머지 차지 */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    width: '100%',
                    borderRadius: '1.1rem',
                    overflow: 'hidden',
                    border: `1px solid ${BORDER}`,
                    background: CARD,
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

                {/* 이름 */}
                {editingIdx === index ? (
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') setEditingIdx(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '0.55rem',
                      border: `1.5px solid ${ACCENT}`,
                      background: '#1e293b',
                      color: TEXT,
                      fontSize: '1.45rem',
                      fontWeight: 700,
                      fontFamily: 'inherit',
                      textAlign: 'center',
                      outline: 'none',
                      boxSizing: 'border-box',
                      flexShrink: 0,
                    }}
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(index, label)}
                    title="클릭하여 이름 수정"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid transparent',
                      color: TEXT,
                      fontSize: '1.45rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontFamily: 'inherit',
                      padding: '0.3rem 0.65rem',
                      borderRadius: '0.5rem',
                      width: '100%',
                      flexShrink: 0,
                      lineHeight: 1.3,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER;
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                    }}
                  >
                    {label}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 저장 바 */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.9rem 2rem',
          borderTop: `1px solid ${BORDER}`,
          marginTop: '1rem',
        }}
      >
        <span style={{ fontSize: '0.85rem', color: MUTED, flexShrink: 0 }}>
          이름을 클릭하면 수정할 수 있습니다
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '0.6rem',
            border: 'none',
            background: saving ? 'rgba(59,130,246,0.35)' : ACCENT,
            color: '#fff',
            fontSize: '0.88rem',
            fontWeight: 800,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          {saving ? '저장 중…' : '이름 저장'}
        </button>
        {saveMsg && (
          <span
            style={{
              fontSize: '0.88rem',
              fontWeight: 700,
              color: saveMsg.startsWith('오류') ? '#F87171' : '#4ADE80',
            }}
          >
            {saveMsg}
          </span>
        )}
      </div>
    </>
  );
}

export function VariantAppendixFullscreen({ onClose }: { onClose: () => void }) {
  const [activeTheme, setActiveTheme] = useState<AppendixTheme>('fruit');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: BG,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'inherit',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 2rem',
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: TEXT, letterSpacing: '-0.01em' }}>
          변형 색지각 이미지 소개
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: `1px solid ${BORDER}`,
            background: 'transparent',
            color: TEXT,
            fontSize: '1.45rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'inherit',
          }}
        >
          ×
        </button>
      </div>

      {/* 탭 */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          borderBottom: `1px solid ${BORDER}`,
          overflowX: 'auto',
        }}
      >
        {APPENDIX_THEMES.map((theme) => (
          <button
            key={theme}
            type="button"
            onClick={() => setActiveTheme(theme)}
            style={{
              padding: '0.75rem 1.75rem',
              fontSize: '0.95rem',
              fontWeight: activeTheme === theme ? 800 : 600,
              color: activeTheme === theme ? ACCENT : MUTED,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTheme === theme ? `2px solid ${ACCENT}` : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            {SPOMOVE_COLOR_THEME_LABELS[theme]}
          </button>
        ))}
      </div>

      {/* 콘텐츠 (이미지 그리드 + 하단 바) */}
      <CategoryContent key={activeTheme} theme={activeTheme} />
    </div>,
    document.body,
  );
}
