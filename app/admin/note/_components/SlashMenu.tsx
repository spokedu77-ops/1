'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type SlashCommand<T extends string = string> = {
  type: T;
  label: string;
  desc: string;
  icon: React.ElementType;
  shortcut?: string;
};

/** `/` 슬래시 메뉴 — BlockPickerMenu와 동일 톤, query는 에디터에서 제어 */
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
      `${cmd.label} ${cmd.desc} ${cmd.type} ${cmd.shortcut ?? ''}`.toLowerCase().includes(q),
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
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (filtered.length === 0) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter')     { e.preventDefault(); const cmd = filtered[activeIndex]; if (cmd) onSelect(cmd.type); onClose(); }
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
        <p className="text-[11px] font-semibold text-neutral-400">{title ?? '블록 선택'}</p>
        <p className="mt-1 truncate text-[13px] text-neutral-600">
          {query.trim() ? `/${query}` : '/'}
        </p>
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

/** fixed 포지션 슬래시 메뉴 (스크롤 클리핑 방지) */
export function SlashMenuFixed<T extends string>({
  show,
  anchor,
  commands,
  query,
  onSelect,
  onClose,
  title,
}: {
  show: boolean;
  anchor: { top: number; left: number } | null;
  commands: SlashCommand<T>[];
  query: string;
  onSelect: (type: T) => void;
  onClose: () => void;
  title?: string;
}) {
  if (!show || !anchor) return null;
  return (
    <div className="fixed z-[9999]" style={{ top: anchor.top, left: anchor.left }}>
      <SlashMenu
        commands={commands}
        query={query}
        onSelect={onSelect}
        onClose={onClose}
        title={title}
      />
    </div>
  );
}

/**
 * + 버튼용 블록 피커.
 * 부모에서 fixed 좌표를 계산해서 position:fixed 컨테이너로 감싸 사용.
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

/** ⋮⋮ 핸들 메뉴 — 복제 · 변환 · 삭제 */
export function BlockHandleMenu<T extends string>({
  commands,
  onDuplicate,
  onDelete,
  onTurnInto,
  onClose,
}: {
  commands: SlashCommand<T>[];
  onDuplicate: () => void;
  onDelete: () => void;
  onTurnInto: (type: T) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showTurnInto, setShowTurnInto] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (showTurnInto) {
    return (
      <div ref={ref} onMouseDown={(e) => e.stopPropagation()}>
        <BlockPickerMenu
          commands={commands}
          onSelect={(type) => { onTurnInto(type); onClose(); }}
          onClose={() => setShowTurnInto(false)}
        />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="w-[180px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-xl shadow-neutral-900/10"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-neutral-700 transition-colors hover:bg-neutral-50"
        onClick={() => { onDuplicate(); onClose(); }}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-[13px]">
          ⧉
        </span>
        복제
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-neutral-700 transition-colors hover:bg-neutral-50"
        onClick={() => setShowTurnInto(true)}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-[13px]">
          ↻
        </span>
        변환
      </button>
      <div className="my-1 border-t border-neutral-100" />
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-rose-600 transition-colors hover:bg-rose-50"
        onClick={() => { onDelete(); onClose(); }}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-rose-100 bg-rose-50 text-[13px]">
          ×
        </span>
        삭제
      </button>
    </div>
  );
}
