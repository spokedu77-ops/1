'use client';

import { Bold, Code2, Italic, Strikethrough, Underline as UnderlineIcon } from 'lucide-react';
import type { InlineMark } from '@/app/lib/note/inlineMarkup';

const INLINE_MARKS: { mark: InlineMark; icon: React.ElementType; label: string }[] = [
  { mark: 'bold', icon: Bold, label: '굵게' },
  { mark: 'italic', icon: Italic, label: '기울임' },
  { mark: 'underline', icon: UnderlineIcon, label: '밑줄' },
  { mark: 'strike', icon: Strikethrough, label: '취소선' },
  { mark: 'code', icon: Code2, label: '코드' },
];

export function BubbleToolbar({
  applyMark,
}: {
  applyMark: (mark: InlineMark) => void;
}) {
  return (
    <>
      {INLINE_MARKS.map(({ mark, icon: Icon, label }) => (
        <button
          key={mark}
          type="button"
          title={label}
          className="rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyMark(mark)}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </>
  );
}
