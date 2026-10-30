'use client';

import { CheckSquare, ExternalLink, ListOrdered, Package } from 'lucide-react';

export function renderTextWithLinks(text: string) {
  if (!text) return '';
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline hover:text-blue-300 inline-flex items-center gap-0.5 break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part} <ExternalLink size={10} />
        </a>
      );
    }
    return part;
  });
}

export type CatalogDetailShape = {
  name?: string;
  category?: string | null;
  image?: string | null;
  simple_desc?: string | null;
  key_points?: string | null;
  usage_examples?: string | null;
};

export function CatalogDetailModal({
  item,
  onClose,
}: {
  item: CatalogDetailShape;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-2 md:p-4 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-[#121212] rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl text-white border border-slate-800 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 md:p-8 pb-4 border-b border-slate-800 flex gap-4 items-center shrink-0">
          <div className="w-16 h-16 rounded-[16px] bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
            {item.image ? (
              <img src={item.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <Package size={28} className="text-slate-600" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
              {item.category}
            </span>
            <h2 className="text-2xl font-black mt-1 leading-none truncate">{item.name}</h2>
            <p className="text-xs text-slate-400 mt-2 line-clamp-2">{item.simple_desc}</p>
          </div>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
          <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-slate-800">
            <h4 className="text-[11px] font-black text-emerald-400 uppercase mb-2 flex items-center gap-2">
              <CheckSquare size={14} /> 핵심 포인트
            </h4>
            <p className="text-sm font-bold text-slate-200 whitespace-pre-line">{item.key_points}</p>
          </div>
          <div>
            <h4 className="text-[11px] font-black text-blue-400 uppercase mb-3 flex items-center gap-2">
              <ListOrdered size={14} /> 활용 방법
            </h4>
            <div className="space-y-3">
              {item.usage_examples?.split('\n').map((line, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-blue-900/30 text-blue-400 text-xs font-black flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-300 font-bold break-all">{renderTextWithLinks(line)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 bg-black/50 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-white text-black rounded-2xl font-black text-sm hover:bg-slate-200"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
