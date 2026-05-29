'use client';

import { useState } from 'react';
import { Bold, ChevronDown, Code2, Italic, Strikethrough, Type, Underline as UnderlineIcon } from 'lucide-react';
import type { InlineMark } from '@/app/lib/note/inlineMarkup';
import { formatShortcutLabel, INLINE_MARK_SHORTCUTS, TEXT_STYLE_SHORTCUTS } from './noteFormatShortcuts';

type TextStyle = 'paragraph' | 'heading1' | 'heading2' | 'heading3';

const INLINE_MARKS: { mark: InlineMark; icon: React.ElementType; label: string; shortcut: string }[] = [
  { mark: 'bold', icon: Bold, label: '굵게', shortcut: INLINE_MARK_SHORTCUTS.bold },
  { mark: 'italic', icon: Italic, label: '기울임', shortcut: INLINE_MARK_SHORTCUTS.italic },
  { mark: 'underline', icon: UnderlineIcon, label: '밑줄', shortcut: INLINE_MARK_SHORTCUTS.underline },
  { mark: 'strike', icon: Strikethrough, label: '취소선', shortcut: INLINE_MARK_SHORTCUTS.strike },
  { mark: 'code', icon: Code2, label: '코드', shortcut: INLINE_MARK_SHORTCUTS.code },
];

const TEXT_STYLES: { style: TextStyle; label: string; hint: string; shortcut: string }[] = [
  { style: 'paragraph', label: '본문', hint: '기본 텍스트', shortcut: TEXT_STYLE_SHORTCUTS.paragraph },
  { style: 'heading1', label: '제목 1', hint: '큰 제목', shortcut: TEXT_STYLE_SHORTCUTS.heading1 },
  { style: 'heading2', label: '제목 2', hint: '중간 제목', shortcut: TEXT_STYLE_SHORTCUTS.heading2 },
  { style: 'heading3', label: '제목 3', hint: '작은 제목', shortcut: TEXT_STYLE_SHORTCUTS.heading3 },
];

export function BubbleToolbar({
  applyMark,
  applyTextStyle = () => undefined,
}: {
  applyMark: (mark: InlineMark) => void;
  applyTextStyle?: (style: TextStyle) => void;
}) {
  const [showTextStyleMenu, setShowTextStyleMenu] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <button
          type="button"
          title={`텍스트 스타일 (${formatShortcutLabel('Mod+Alt+1')} 등)`}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowTextStyleMenu((v) => !v)}
        >
          <Type className="h-4 w-4" />
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showTextStyleMenu ? 'rotate-180' : ''}`} />
        </button>
        {showTextStyleMenu && (
          <div className="absolute left-0 top-full z-10 mt-1 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            {TEXT_STYLES.map(({ style, label, hint, shortcut }) => (
              <button
                key={style}
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  applyTextStyle(style);
                  setShowTextStyleMenu(false);
                }}
              >
                <span>
                  <span className="block text-[13px] font-medium text-slate-700">{label}</span>
                  <span className="block text-[11px] text-slate-400">{hint}</span>
                </span>
                <span className="shrink-0 text-[10px] font-medium text-slate-400">{formatShortcutLabel(shortcut)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="h-5 w-px bg-slate-200" />
      {INLINE_MARKS.map(({ mark, icon: Icon, label, shortcut }) => (
        <button
          key={mark}
          type="button"
          title={`${label} (${formatShortcutLabel(shortcut)})`}
          className="rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyMark(mark)}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
