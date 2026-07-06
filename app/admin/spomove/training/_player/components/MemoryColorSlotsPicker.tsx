'use client';

import React from 'react';
import { COLORS } from '../constants';
import {
  SPOMOVE_MEMORY_COLOR_ORDER,
  SPOMOVE_MEMORY_COLOR_SHORT,
  SPOMOVE_MEMORY_SLOT_COUNT,
  type SpomoveMemoryColorId,
} from '../lib/memoryColorSlots';

const COLOR_BY_ID = Object.fromEntries(COLORS.map((c) => [c.id, c])) as Record<
  SpomoveMemoryColorId,
  (typeof COLORS)[number]
>;

type Props = {
  slots: SpomoveMemoryColorId[];
  onChange: (slots: SpomoveMemoryColorId[]) => void;
  accent?: string;
  borderColor?: string;
  mutedColor?: string;
  textColor?: string;
  cardBg?: string;
};

export function MemoryColorSlotsPicker({
  slots,
  onChange,
  accent = '#22C55E',
  borderColor = 'rgba(255,255,255,0.12)',
  mutedColor = 'rgba(255,255,255,0.45)',
  textColor = '#fff',
  cardBg = 'rgba(255,255,255,0.04)',
}: Props) {
  const setSlot = (index: number, colorId: SpomoveMemoryColorId) => {
    const next = [...slots];
    next[index] = colorId;
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: SPOMOVE_MEMORY_SLOT_COUNT }, (_, i) => {
        const activeId = slots[i] ?? 'red';
        return (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '2.2rem 1fr',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 12,
              border: `1px solid ${borderColor}`,
              background: cardBg,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 900, color: mutedColor, textAlign: 'center' }}>{i + 1}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SPOMOVE_MEMORY_COLOR_ORDER.map((colorId) => {
                const c = COLOR_BY_ID[colorId];
                const active = activeId === colorId;
                return (
                  <button
                    key={colorId}
                    type="button"
                    onClick={() => setSlot(i, colorId)}
                    style={{
                      flex: '1 1 52px',
                      minWidth: 52,
                      padding: '8px 6px',
                      borderRadius: 10,
                      border: `2px solid ${active ? accent : borderColor}`,
                      background: active ? `${c.bg}33` : 'transparent',
                      color: active ? textColor : mutedColor,
                      fontFamily: 'inherit',
                      fontSize: 13,
                      fontWeight: active ? 900 : 700,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 6,
                        background: c.bg,
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: active ? `0 0 0 2px ${accent}` : 'none',
                      }}
                    />
                    {SPOMOVE_MEMORY_COLOR_SHORT[colorId]}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
