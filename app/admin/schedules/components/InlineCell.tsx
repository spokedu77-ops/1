'use client';

import { useState, useRef, useEffect } from 'react';

type InlineCellProps =
  | {
      kind: 'text';
      value: string;
      onSave: (v: string) => void;
      placeholder?: string;
    }
  | {
      kind: 'number';
      value: number | null;
      onSave: (v: number | null) => void;
      placeholder?: string;
    };

export function InlineCell(props: InlineCellProps) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(
    props.kind === 'text' ? props.value : String(props.value ?? '')
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const displayValue =
    props.kind === 'text'
      ? (props.value || '').trim() || (props.placeholder ?? '')
      : props.value != null ? String(props.value) : props.placeholder ?? '';

  const handleBlur = () => {
    setEditing(false);
    if (props.kind === 'text') {
      const v = local.trim();
      if (v !== props.value) props.onSave(v);
    } else {
      const num = local === '' ? null : parseInt(local, 10);
      if (Number.isNaN(num) && local !== '') return;
      if (num !== props.value) props.onSave(num);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={props.kind === 'number' ? 'number' : 'text'}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="w-full min-w-0 rounded border border-blue-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setLocal(props.kind === 'text' ? props.value || '' : String(props.value ?? ''));
        setEditing(true);
      }}
      className="w-full text-left rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 min-h-[28px] border border-transparent hover:border-slate-200 cursor-pointer"
    >
      <span className={!displayValue ? 'text-slate-400' : ''}>
        {displayValue || (props.placeholder ?? '')}
      </span>
    </button>
  );
}
