'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type SlashCommand<T extends string = string> = {
  type: T;
  label: string;
  desc: string;
  icon: React.ElementType;
  shortcut?: string;
};

/** 인라인 전환 메뉴 (/ 슬래시 트리거, 블록 위 호버) */
export function SlashMenu<T extends string>({
  commands,
  query,
  onSelect,
  onClose,
  title,
}: {
  commands: SlashCommand<T>[];
  query: string;
  onSelect: (type: T) => void;
  onClose: () => void;
  title?: string;
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

  useEffect(() => { setActiveIndex(0); }, [query]);

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
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => (i + 1) % filtered.length); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length); }
      if (e.key === 'Enter')     { e.preventDefault(); const cmd = filtered[activeIndex]; if (cmd) onSelect(cmd.type); onClose(); }
      if (e.key === 'Escape')    { e.preventDefault(); onClose(); }
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
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{title ?? 'Turn into'}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {query.trim() ? `검색: ${query}` : '블록 종류를 선택하세요'}
        </p>
      </div>
      {filtered.length > 0 ? (
        filtered.map(({ type, label, icon: Icon, desc, shortcut }, idx) => (
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
            <span className="flex-1">
              <p className="text-[13px] font-semibold text-slate-800">{label}</p>
              <p className="text-[11px] text-slate-400">{desc}</p>
            </span>
            {shortcut && (
              <span className="shrink-0 text-[11px] text-slate-300">{shortcut}</span>
            )}
          </button>
        ))
      ) : (
        <p className="px-3 py-3 text-[12px] text-slate-400">일치하는 명령이 없습니다.</p>
      )}
    </div>
  );
}

/**
 * + 버튼용 블록 피커.
 * 부모에서 fixed 좌표를 계산해서 position:fixed 컨테이너로 감싸 사용.
 * 이 컴포넌트 자체는 position-agnostic (relative 없음).
 */
export function BlockPickerMenu<T extends string>({
  commands,
  onSelect,
  onClose,
}: {
  commands: SlashCommand<T>[];
  onSelect: (type: T) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) =>
      `${cmd.label} ${cmd.desc} ${cmd.type}`.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => { setActiveIndex(0); }, [query]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter')     { e.preventDefault(); const cmd = filtered[activeIndex]; if (cmd) { onSelect(cmd.type); onClose(); } }
      if (e.key === 'Escape')    { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeIndex, filtered, onClose, onSelect]);

  return (
    <div
      ref={ref}
      className="w-[240px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl shadow-neutral-900/10"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="border-b border-neutral-100 px-3 py-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="필터링 기준을 입력하세요."
          className="w-full bg-transparent text-[13px] text-neutral-700 outline-none placeholder:text-neutral-400"
        />
      </div>
      <div className="border-b border-neutral-100 px-3 py-1">
        <p className="text-[11px] font-semibold text-neutral-400">기본 블록</p>
      </div>
      <div className="max-h-[280px] overflow-y-auto py-1">
        {filtered.length > 0 ? (
          filtered.map(({ type, label, icon: Icon, shortcut }, idx) => (
            <button
              key={type}
              type="button"
              className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
                idx === activeIndex ? 'bg-neutral-100' : 'hover:bg-neutral-50'
              }`}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => { onSelect(type); onClose(); }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white">
                <Icon className="h-3.5 w-3.5 text-neutral-500" />
              </span>
              <span className="flex-1 text-[13px] font-medium text-neutral-700">{label}</span>
              {shortcut && <span className="shrink-0 text-[11px] text-neutral-300">{shortcut}</span>}
            </button>
          ))
        ) : (
          <p className="px-3 py-2 text-[12px] text-neutral-400">결과 없음</p>
        )}
      </div>
      <div className="border-t border-neutral-100 px-3 py-1.5">
        <p className="text-[11px] text-neutral-400">메뉴 닫기 <span className="ml-1 font-medium text-neutral-300">esc</span></p>
      </div>
    </div>
  );
}
