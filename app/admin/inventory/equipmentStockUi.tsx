'use client';

import { Package } from 'lucide-react';
import type { EquipmentStockRow } from '@/app/lib/equipment/types';

export type StockDisplayStatus = 'normal' | 'opening' | 'drift' | 'catalog_only';

export function getStockDisplayStatus(row: EquipmentStockRow, ledgerWrites: boolean): StockDisplayStatus {
  if (row.stock_metrics_available === false) return 'catalog_only';
  if (row.cache_drift) return 'drift';
  if (ledgerWrites && !row.opening_confirmed) return 'opening';
  return 'normal';
}

export function stockStatusLabel(status: StockDisplayStatus): string {
  switch (status) {
    case 'opening':
      return '재고 미확정';
    case 'drift':
      return '캐시 불일치';
    case 'catalog_only':
      return '수불 대기';
    default:
      return '정상';
  }
}

export function stockStatusBadgeClass(status: StockDisplayStatus): string {
  switch (status) {
    case 'opening':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'drift':
      return 'bg-red-50 text-red-800 border-red-200';
    case 'catalog_only':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  }
}

export function canShowStockQty(row: EquipmentStockRow, ledgerWrites: boolean): boolean {
  if (row.stock_metrics_available === false) return false;
  const status = getStockDisplayStatus(row, ledgerWrites);
  return status === 'normal';
}

function StockThumb({ image }: { image: string | null; name: string }) {
  return (
    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
      {image ? (
        <img src={image} alt="" className="w-full h-full object-cover" />
      ) : (
        <Package size={18} className="text-slate-400" />
      )}
    </div>
  );
}

type StockActionsProps = {
  row: EquipmentStockRow;
  ledgerWrites: boolean;
  onDetail: () => void;
  onEdit: () => void;
  onRent: () => void;
  onAdjust: () => void;
  onQuarantine: () => void;
};

function StockActions({ row, ledgerWrites, onDetail, onEdit, onRent, onAdjust, onQuarantine }: StockActionsProps) {
  const showQty = canShowStockQty(row, ledgerWrites);
  const catalogOnly = row.stock_metrics_available === false;
  const canMutate = ledgerWrites && showQty && !catalogOnly;
  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" className="text-xs font-bold text-indigo-600" onClick={onDetail}>
        상세
      </button>
      {!catalogOnly && (
        <button type="button" className="text-xs font-bold text-slate-600" onClick={onEdit}>
          수정
        </button>
      )}
      {canMutate && (
        <>
          <button type="button" className="text-xs font-bold text-indigo-600" onClick={onRent}>
            대여
          </button>
          <button type="button" className="text-xs font-bold text-slate-600" onClick={onAdjust}>
            재고 조정
          </button>
          <button type="button" className="text-xs font-bold text-slate-600" onClick={onQuarantine}>
            격리
          </button>
        </>
      )}
    </div>
  );
}

type StockListProps = {
  rows: EquipmentStockRow[];
  ledgerWrites: boolean;
  onDetail: (row: EquipmentStockRow) => void;
  onEdit: (row: EquipmentStockRow) => void;
  onRent: (row: EquipmentStockRow) => void;
  onAdjust: (row: EquipmentStockRow) => void;
  onQuarantine: (row: EquipmentStockRow) => void;
};

export function EquipmentStockTable({
  rows,
  ledgerWrites,
  onDetail,
  onEdit,
  onRent,
  onAdjust,
  onQuarantine,
}: StockListProps) {
  return (
    <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
          <tr>
            <th className="p-3">교구</th>
            <th className="p-3">카테고리</th>
            <th className="p-3">관리번호</th>
            <th className="p-3 text-right">T</th>
            <th className="p-3 text-right">W</th>
            <th className="p-3 text-right">L</th>
            <th className="p-3 text-right">Q</th>
            <th className="p-3 text-right">A</th>
            <th className="p-3">상태</th>
            <th className="p-3">작업</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="p-8 text-center text-slate-400">
                등록된 교구가 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const showQty = canShowStockQty(row, ledgerWrites);
              const status = getStockDisplayStatus(row, ledgerWrites);
              return (
                <tr key={row.catalog_id} className="border-t border-slate-100 align-middle">
                  <td className="p-3">
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <StockThumb image={row.image} name={row.name} />
                      <span className="font-semibold">{row.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-500">{row.category ?? '—'}</td>
                  <td className="p-3 text-slate-500">{row.mgmt_code ?? '—'}</td>
                  <td className="p-3 text-right tabular-nums">{showQty ? row.qty_on_hand_total : '—'}</td>
                  <td className="p-3 text-right tabular-nums">{showQty ? row.qty_warehouse : '—'}</td>
                  <td className="p-3 text-right tabular-nums">{showQty ? row.qty_lent : '—'}</td>
                  <td className="p-3 text-right tabular-nums">{showQty ? row.qty_quarantine : '—'}</td>
                  <td className="p-3 text-right tabular-nums text-base font-black text-indigo-700">
                    {showQty ? row.qty_available : '—'}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full border ${stockStatusBadgeClass(status)}`}
                    >
                      {stockStatusLabel(status)}
                    </span>
                  </td>
                  <td className="p-3">
                    <StockActions
                      row={row}
                      ledgerWrites={ledgerWrites}
                      onDetail={() => onDetail(row)}
                      onEdit={() => onEdit(row)}
                      onRent={() => onRent(row)}
                      onAdjust={() => onAdjust(row)}
                      onQuarantine={() => onQuarantine(row)}
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export function EquipmentStockCards({
  rows,
  ledgerWrites,
  onDetail,
  onEdit,
  onRent,
  onAdjust,
  onQuarantine,
}: StockListProps) {
  if (rows.length === 0) {
    return <p className="lg:hidden text-sm text-slate-400 text-center py-8">등록된 교구가 없습니다.</p>;
  }
  return (
    <div className="lg:hidden space-y-3">
      {rows.map((row) => {
        const showQty = canShowStockQty(row, ledgerWrites);
        const status = getStockDisplayStatus(row, ledgerWrites);
        return (
          <article
            key={row.catalog_id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
          >
            <div className="flex gap-3 items-start">
              <StockThumb image={row.image} name={row.name} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">{row.name}</p>
                <p className="text-xs text-slate-500">{row.category ?? '—'}</p>
                {row.mgmt_code ? <p className="text-xs text-slate-400">관리번호 {row.mgmt_code}</p> : null}
              </div>
              <span
                className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border ${stockStatusBadgeClass(status)}`}
              >
                {stockStatusLabel(status)}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {(['T', 'W', 'L', 'Q'] as const).map((label, i) => {
                const val = [row.qty_on_hand_total, row.qty_warehouse, row.qty_lent, row.qty_quarantine][i];
                return (
                  <div key={label} className="rounded-lg bg-slate-50 py-2">
                    <p className="text-slate-400 font-bold">{label}</p>
                    <p className="tabular-nums font-semibold text-slate-800">{showQty ? val : '—'}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
              <span className="text-xs font-bold text-indigo-700">대여 가능 (A)</span>
              <span className="text-2xl font-black tabular-nums text-indigo-700">{showQty ? row.qty_available : '—'}</span>
            </div>
            <StockActions
              row={row}
              ledgerWrites={ledgerWrites}
              onDetail={() => onDetail(row)}
              onEdit={() => onEdit(row)}
              onRent={() => onRent(row)}
              onAdjust={() => onAdjust(row)}
              onQuarantine={() => onQuarantine(row)}
            />
          </article>
        );
      })}
    </div>
  );
}
