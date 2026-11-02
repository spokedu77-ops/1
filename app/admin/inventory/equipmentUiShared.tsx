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
  mgmt_code?: string | null;
  image?: string | null;
  simple_desc?: string | null;
  key_points?: string | null;
  usage_examples?: string | null;
};

export type CatalogStockDetail = {
  qty_on_hand_total: number;
  qty_warehouse: number;
  qty_lent: number;
  qty_quarantine: number;
  qty_available: number;
  showQty: boolean;
  statusLabel: string;
};

export type CatalogTeacherHolding = {
  teacher_name: string;
  qty_outstanding: number;
};

export function CatalogDetailModal({
  item,
  stock,
  teacherHoldings,
  holdingsLoading,
  onClose,
}: {
  item: CatalogDetailShape;
  stock?: CatalogStockDetail | null;
  teacherHoldings?: CatalogTeacherHolding[];
  holdingsLoading?: boolean;
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
            {item.mgmt_code ? (
              <p className="text-[10px] text-slate-500 mt-1">관리번호 {item.mgmt_code}</p>
            ) : null}
            <p className="text-xs text-slate-400 mt-2 line-clamp-2">{item.simple_desc}</p>
          </div>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
          {stock ? (
            <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-[11px] font-black text-indigo-400 uppercase">창고 재고</h4>
              <p className="text-xs text-slate-400">상태: {stock.statusLabel}</p>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {(
                  [
                    ['T', stock.qty_on_hand_total],
                    ['W', stock.qty_warehouse],
                    ['L', stock.qty_lent],
                    ['Q', stock.qty_quarantine],
                    ['A', stock.qty_available],
                  ] as const
                ).map(([label, val]) => (
                  <div key={label} className="rounded-lg bg-slate-900/80 py-2">
                    <p className="text-slate-500 font-bold">{label}</p>
                    <p className={`tabular-nums font-bold ${label === 'A' ? 'text-indigo-400 text-lg' : 'text-slate-200'}`}>
                      {stock.showQty ? val : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {stock !== undefined ? (
            <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-slate-800">
              <h4 className="text-[11px] font-black text-amber-400 uppercase mb-2">강사별 미반납</h4>
              {holdingsLoading ? (
                <p className="text-xs text-slate-500">불러오는 중…</p>
              ) : teacherHoldings && teacherHoldings.length > 0 ? (
                <ul className="space-y-2">
                  {teacherHoldings.map((h) => (
                    <li key={h.teacher_name} className="flex justify-between text-sm font-bold text-slate-200">
                      <span>{h.teacher_name}</span>
                      <span className="tabular-nums text-indigo-300">{h.qty_outstanding}개</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">활성 대여 없음</p>
              )}
            </div>
          ) : null}
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
