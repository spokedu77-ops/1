'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Search } from 'lucide-react';

function normalizeQuery(v: string): string {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export default function ProgramPickerModal({
  open,
  title,
  programs,
  onClose,
  onPick,
}: {
  open: boolean;
  title?: string;
  programs: Array<{ id: number; title: string }>;
  onClose: () => void;
  onPick: (programId: number) => void;
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = normalizeQuery(query);
    if (!q) return programs;
    return programs.filter((p) => normalizeQuery(p.title).includes(q) || String(p.id).includes(q));
  }, [programs, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
      <div
        role="presentation"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-0 p-3 md:p-6 flex items-center justify-center">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 bg-slate-950/60 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate">{title ?? '프로그램 선택'}</p>
              <p className="text-xs text-slate-400">{filtered.length}개</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 text-white border border-slate-700 hover:bg-slate-700"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="제목 검색 (또는 ID)"
                className="w-full bg-transparent border-0 text-white text-sm focus:outline-none"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">클릭하면 바로 선택됩니다. (ESC로 닫기)</p>
          </div>

          <div className="max-h-[60vh] overflow-y-auto custom-scroll">
            {filtered.length === 0 ? (
              <div className="p-6 text-slate-400 text-sm">검색 결과가 없습니다.</div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onPick(p.id)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-800/60 transition-colors"
                    >
                      <p className="text-sm font-black text-white">
                        <span className="text-slate-400 font-bold">#{p.id}</span> {p.title}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 text-sm font-bold"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

