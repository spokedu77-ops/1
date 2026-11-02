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
      return '재고 미입력';
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

export function formatWarehouseDisplay(row: EquipmentStockRow, ledgerWrites: boolean): string {
  if (row.stock_metrics_available === false) return '—';
  if (!ledgerWrites) return '—';
  if (!row.opening_confirmed) return '미입력';
  return String(row.qty_warehouse);
}

export function formatMetricDisplay(row: EquipmentStockRow, ledgerWrites: boolean, value: number): string {
  if (!canShowStockQty(row, ledgerWrites)) return '—';
  return String(value);
}

export function formatTotalDisplay(row: EquipmentStockRow, ledgerWrites: boolean): string {
  if (row.stock_metrics_available === false || !ledgerWrites) return '—';
  if (row.opening_confirmed) return String(row.qty_on_hand_total);
  if (row.legacy_mapping_pending) return '—';
  const held = row.legacy_qty_held;
  if (held != null && held > 0) return `${held}+`;
  return '—';
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
  onRent: () => void;
  onAdjust: () => void;
  onStockInput?: () => void;
};

function StockActions({ row, ledgerWrites, onDetail, onRent, onAdjust, onStockInput }: StockActionsProps) {
  const catalogOnly = row.stock_metrics_available === false;
  const showQty = canShowStockQty(row, ledgerWrites);

  if (catalogOnly) {
    return (
      <button type="button" className="text-xs font-bold text-indigo-600" onClick={onDetail}>
        상세
      </button>
    );
  }

  if (ledgerWrites && !row.opening_confirmed && onStockInput) {
    return (
      <button type="button" className="text-xs font-bold text-indigo-600" onClick={onStockInput}>
        재고 입력
      </button>
    );
  }

  if (ledgerWrites && showQty) {
    return (
      <div className="flex flex-wrap items-center gap-1 text-xs font-bold">
        <button type="button" className="text-indigo-600 hover:underline" onClick={onRent}>
          대여
        </button>
        <span className="text-slate-300" aria-hidden>
          ·
        </span>
        <button type="button" className="text-indigo-600 hover:underline" onClick={onAdjust}>
          재고 조정
        </button>
      </div>
    );
  }

  return (
    <button type="button" className="text-xs font-bold text-indigo-600" onClick={onDetail}>
      상세
    </button>
  );
}

type StockListProps = {
  rows: EquipmentStockRow[];
  ledgerWrites: boolean;
  onDetail: (row: EquipmentStockRow) => void;
  onRent: (row: EquipmentStockRow) => void;
  onAdjust: (row: EquipmentStockRow) => void;
  onStockInput?: (row: EquipmentStockRow) => void;
};

export function EquipmentStockTable({ rows, ledgerWrites, onDetail, onRent, onAdjust, onStockInput }: StockListProps) {
  return (
    <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-slate-50 text-[11px] font-bold text-slate-600">
          <tr>
            <th className="p-3">교구</th>
            <th className="p-3 text-right">총보유</th>
            <th className="p-3 text-right">창고재고</th>
            <th className="p-3 text-right">대여 중</th>
            <th className="p-3 text-right">대여 가능</th>
            <th className="p-3">관리</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-slate-400">
                등록된 교구가 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.catalog_id} className="border-t border-slate-100 align-middle">
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => onDetail(row)}
                    className="flex items-center gap-2 min-w-[140px] text-left hover:opacity-80"
                  >
                    <StockThumb image={row.image} name={row.name} />
                    <span className="font-semibold text-slate-900">{row.name}</span>
                  </button>
                </td>
                <td className="p-3 text-right tabular-nums font-semibold text-slate-800">
                  {formatTotalDisplay(row, ledgerWrites)}
                </td>
                <td className="p-3 text-right tabular-nums text-slate-700">
                  {formatWarehouseDisplay(row, ledgerWrites)}
                </td>
                <td className="p-3 text-right tabular-nums text-slate-700">
                  {formatMetricDisplay(row, ledgerWrites, row.qty_lent)}
                </td>
                <td className="p-3 text-right tabular-nums text-lg font-black text-indigo-700">
                  {formatMetricDisplay(row, ledgerWrites, row.qty_available)}
                </td>
                <td className="p-3">
                  <StockActions
                    row={row}
                    ledgerWrites={ledgerWrites}
                    onDetail={() => onDetail(row)}
                    onRent={() => onRent(row)}
                    onAdjust={() => onAdjust(row)}
                    onStockInput={onStockInput ? () => onStockInput(row) : undefined}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function EquipmentStockCards({ rows, ledgerWrites, onDetail, onRent, onAdjust, onStockInput }: StockListProps) {
  if (rows.length === 0) {
    return <p className="lg:hidden text-sm text-slate-400 text-center py-8">등록된 교구가 없습니다.</p>;
  }
  return (
    <div className="lg:hidden space-y-3">
      {rows.map((row) => {
        const status = getStockDisplayStatus(row, ledgerWrites);
        const statusVisible = status !== 'normal';
        return (
          <article key={row.catalog_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <button type="button" onClick={() => onDetail(row)} className="flex gap-3 items-start w-full text-left">
              <StockThumb image={row.image} name={row.name} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">{row.name}</p>
                {statusVisible ? (
                  <span
                    className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${stockStatusBadgeClass(status)}`}
                  >
                    {stockStatusLabel(status)}
                  </span>
                ) : null}
              </div>
            </button>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              {(
                [
                  ['총보유', formatTotalDisplay(row, ledgerWrites)],
                  ['창고재고', formatWarehouseDisplay(row, ledgerWrites)],
                  ['대여 중', formatMetricDisplay(row, ledgerWrites, row.qty_lent)],
                  ['대여 가능', formatMetricDisplay(row, ledgerWrites, row.qty_available)],
                ] as const
              ).map(([label, val]) => (
                <div
                  key={label}
                  className={`rounded-lg py-2 px-1 ${label === '대여 가능' ? 'bg-indigo-50' : 'bg-slate-50'}`}
                >
                  <p className="text-slate-500 font-bold">{label}</p>
                  <p
                    className={`tabular-nums font-semibold ${label === '대여 가능' ? 'text-indigo-700 text-lg font-black' : 'text-slate-800'}`}
                  >
                    {val}
                  </p>
                </div>
              ))}
            </div>
            <StockActions
              row={row}
              ledgerWrites={ledgerWrites}
              onDetail={() => onDetail(row)}
              onRent={() => onRent(row)}
              onAdjust={() => onAdjust(row)}
              onStockInput={onStockInput ? () => onStockInput(row) : undefined}
            />
          </article>
        );
      })}
    </div>
  );
}
