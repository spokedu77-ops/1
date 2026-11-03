'use client';

import { Package } from 'lucide-react';
import type { EquipmentStockRow } from '@/app/lib/equipment/types';
import styles from './equipmentInventory.module.css';

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
      return styles.badgeOpening;
    case 'drift':
      return styles.badgeDrift;
    case 'catalog_only':
      return styles.badgeCatalogOnly;
    default:
      return styles.badgeNormal;
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
    <div className={styles.thumb}>
      {image ? (
        <img src={image} alt="" className="w-full h-full object-cover" />
      ) : (
        <Package size={16} className="text-gray-400" />
      )}
    </div>
  );
}

type StockActionsProps = {
  row: EquipmentStockRow;
  ledgerWrites: boolean;
  openingPersistEnabled: boolean;
  onDetail: () => void;
  onRent: () => void;
  onAdjust: () => void;
  onStockInput?: () => void;
};

function StockActions({
  row,
  ledgerWrites,
  openingPersistEnabled,
  onDetail,
  onRent,
  onAdjust,
  onStockInput,
}: StockActionsProps) {
  const catalogOnly = row.stock_metrics_available === false;
  const showQty = canShowStockQty(row, ledgerWrites);
  const canRent = showQty && row.qty_available > 0;

  if (catalogOnly) {
    return (
      <div className={styles.actionRow}>
        <button type="button" className={`${styles.btnGhost} ${styles.btnSm}`} onClick={onDetail}>
          상세
        </button>
      </div>
    );
  }

  if (ledgerWrites && !row.opening_confirmed && onStockInput && openingPersistEnabled) {
    return (
      <div className={styles.actionRow}>
        <button type="button" className={`${styles.btnPrimary} ${styles.btnSm}`} onClick={onStockInput}>
          재고 입력
        </button>
      </div>
    );
  }

  if (ledgerWrites && showQty) {
    return (
      <div className={styles.actionRow}>
        <button
          type="button"
          className={`${styles.btnWarning} ${styles.btnSm}`}
          onClick={onRent}
          disabled={!canRent}
        >
          대여
        </button>
        <button type="button" className={`${styles.btnGhost} ${styles.btnSm}`} onClick={onAdjust}>
          재고 조정
        </button>
        <button type="button" className={`${styles.btnGhost} ${styles.btnSm}`} onClick={onDetail}>
          상세
        </button>
      </div>
    );
  }

  return (
    <div className={styles.actionRow}>
      <button type="button" className={`${styles.btnGhost} ${styles.btnSm}`} onClick={onDetail}>
        상세
      </button>
    </div>
  );
}

type StockListProps = {
  rows: EquipmentStockRow[];
  ledgerWrites: boolean;
  openingPersistEnabled: boolean;
  onDetail: (row: EquipmentStockRow) => void;
  onRent: (row: EquipmentStockRow) => void;
  onAdjust: (row: EquipmentStockRow) => void;
  onStockInput?: (row: EquipmentStockRow) => void;
};

export function EquipmentStockTable({
  rows,
  ledgerWrites,
  openingPersistEnabled,
  onDetail,
  onRent,
  onAdjust,
  onStockInput,
}: StockListProps) {
  return (
    <div className={`${styles.tableWrap} ${styles.desktopTable}`}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.textLeft}>품명</th>
            <th className={styles.textRight}>총보유</th>
            <th className={styles.textRight}>창고재고</th>
            <th className={styles.textRight}>대여 중</th>
            <th className={styles.textRight}>현재가용</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className={styles.emptyState}>
                등록된 교구가 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const status = getStockDisplayStatus(row, ledgerWrites);
              return (
                <tr key={row.catalog_id}>
                  <td className={styles.textLeft}>
                    <button type="button" onClick={() => onDetail(row)} className={styles.stockNameBtn}>
                      <StockThumb image={row.image} name={row.name} />
                      <span>{row.name}</span>
                      {status !== 'normal' ? (
                        <span className={stockStatusBadgeClass(status)}>{stockStatusLabel(status)}</span>
                      ) : null}
                    </button>
                  </td>
                  <td className={styles.textRight}>{formatTotalDisplay(row, ledgerWrites)}</td>
                  <td className={styles.textRight}>{formatWarehouseDisplay(row, ledgerWrites)}</td>
                  <td className={`${styles.textRight} ${styles.metricLent}`}>
                    {formatMetricDisplay(row, ledgerWrites, row.qty_lent)}
                  </td>
                  <td className={`${styles.textRight} ${styles.metricAvail}`}>
                    {formatMetricDisplay(row, ledgerWrites, row.qty_available)}
                  </td>
                  <td>
                    <StockActions
                      row={row}
                      ledgerWrites={ledgerWrites}
                      openingPersistEnabled={openingPersistEnabled}
                      onDetail={() => onDetail(row)}
                      onRent={() => onRent(row)}
                      onAdjust={() => onAdjust(row)}
                      onStockInput={onStockInput ? () => onStockInput(row) : undefined}
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
  openingPersistEnabled,
  onDetail,
  onRent,
  onAdjust,
  onStockInput,
}: StockListProps) {
  if (rows.length === 0) {
    return <p className={styles.emptyState}>등록된 교구가 없습니다.</p>;
  }
  return (
    <div className={styles.mobileCards}>
      {rows.map((row) => {
        const status = getStockDisplayStatus(row, ledgerWrites);
        return (
          <article key={row.catalog_id} className={styles.panel}>
            <button type="button" onClick={() => onDetail(row)} className={`${styles.stockNameBtn} w-full mb-3`}>
              <StockThumb image={row.image} name={row.name} />
              <div className="flex-1 min-w-0">
                <p className="truncate">{row.name}</p>
                {status !== 'normal' ? (
                  <span className={`${stockStatusBadgeClass(status)} mt-1`}>{stockStatusLabel(status)}</span>
                ) : null}
              </div>
            </button>
            <div className="grid grid-cols-2 gap-2 text-center text-xs mb-3">
              {(
                [
                  ['총보유', formatTotalDisplay(row, ledgerWrites), false],
                  ['창고', formatWarehouseDisplay(row, ledgerWrites), false],
                  ['대여 중', formatMetricDisplay(row, ledgerWrites, row.qty_lent), false],
                  ['가용', formatMetricDisplay(row, ledgerWrites, row.qty_available), true],
                ] as const
              ).map(([label, val, highlight]) => (
                <div
                  key={label}
                  className="rounded-md py-2 px-1"
                  style={{ background: highlight ? '#eff6ff' : '#f9fafb' }}
                >
                  <p className="text-gray-500 font-semibold">{label}</p>
                  <p className={`tabular-nums font-semibold ${highlight ? styles.metricAvail : ''}`}>{val}</p>
                </div>
              ))}
            </div>
            <StockActions
              row={row}
              ledgerWrites={ledgerWrites}
              openingPersistEnabled={openingPersistEnabled}
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
