'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type SlashCommand<T extends string = string> = {
  type: T;
  label: string;
  desc: string;
  icon: React.ElementType;
};

export function SlashMenu<T extends string>({
  commands,
  query,
  onSelect,
  onClose,
}: {
  commands: SlashCommand<T>[];
  query: string;
  onSelect: (type: T) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) =>
      `${cmd.label} ${cmd.desc} ${cmd.type}`.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (filtered.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((idx) => (idx + 1) % filtered.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((idx) => (idx - 1 + filtered.length) % filtered.length);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const command = filtered[activeIndex];
        if (command) onSelect(command.type);
        onClose();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeIndex, filtered, onClose, onSelect]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-2 w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10"
    >
      <div className="border-b border-slate-100 px-3 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Turn into</p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {query.trim() ? `검색: ${query}` : '블록 종류를 선택하세요'}
        </p>
      </div>
      {filtered.length > 0 ? (
        filtered.map(({ type, label, icon: Icon, desc }, idx) => (
          <button
            key={type}
            type="button"
            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
              idx === activeIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
            }`}
            onMouseEnter={() => setActiveIndex(idx)}
            onClick={() => { onSelect(type); onClose(); }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white shadow-sm">
              <Icon className="h-4 w-4 text-slate-500" />
            </span>
            <span>
              <p className="text-[13px] font-semibold text-slate-800">{label}</p>
              <p className="text-[11px] text-slate-400">{desc}</p>
            </span>
          </button>
        ))
      ) : (
        <p className="px-3 py-3 text-[12px] text-slate-400">일치하는 명령이 없습니다.</p>
      )}
    </div>
  );
}
