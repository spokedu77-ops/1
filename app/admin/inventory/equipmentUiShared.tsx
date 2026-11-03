'use client';

import { CheckSquare, ExternalLink, ListOrdered, Package } from 'lucide-react';
import styles from './equipmentInventory.module.css';

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
          className="text-blue-600 underline hover:text-blue-700 inline-flex items-center gap-0.5 break-all"
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
  onEdit,
  onAdjustStock,
  onClose,
}: {
  item: CatalogDetailShape;
  stock?: CatalogStockDetail | null;
  teacherHoldings?: CatalogTeacherHolding[];
  holdingsLoading?: boolean;
  onEdit?: () => void;
  onAdjustStock?: () => void;
  onClose: () => void;
}) {
  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={styles.modalCardWide}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, maxHeight: '90vh' }}
      >
        <div className={styles.modalHeader}>
          <div className="flex gap-3 items-center min-w-0 text-left">
            <div className={styles.thumb} style={{ width: 48, height: 48 }}>
              {item.image ? (
                <img src={item.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <Package size={22} className="text-gray-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase">{item.category}</p>
              <h3 className="truncate">{item.name}</h3>
            </div>
          </div>
          <button type="button" className={`${styles.btnGhost} ${styles.btnSm}`} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>
          {item.simple_desc ? <p className="text-sm text-gray-600">{item.simple_desc}</p> : null}
          {stock ? (
            <div className={styles.panel} style={{ padding: 12 }}>
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">창고 재고</h4>
              <p className="text-xs text-gray-500 mb-2">상태: {stock.statusLabel}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                {(
                  [
                    ['총보유', stock.qty_on_hand_total],
                    ['창고재고', stock.qty_warehouse],
                    ['대여 중', stock.qty_lent],
                    ['대여 가능', stock.qty_available],
                  ] as const
                ).map(([label, val]) => (
                  <div key={label} className="rounded-md bg-gray-50 py-2 px-1">
                    <p className="text-gray-500 font-semibold">{label}</p>
                    <p className={`tabular-nums font-bold ${label === '대여 가능' ? styles.metricAvail : ''}`}>
                      {stock.showQty ? val : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {stock !== undefined ? (
            <div className={styles.panel} style={{ padding: 12 }}>
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">강사별 미반납</h4>
              {holdingsLoading ? (
                <p className="text-xs text-gray-500">불러오는 중…</p>
              ) : teacherHoldings && teacherHoldings.length > 0 ? (
                <ul className="space-y-2">
                  {teacherHoldings.map((h) => (
                    <li key={h.teacher_name} className="flex justify-between text-sm font-semibold">
                      <span>{h.teacher_name}</span>
                      <span className={`tabular-nums ${styles.metricAvail}`}>{h.qty_outstanding}개</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500">활성 대여 없음</p>
              )}
            </div>
          ) : null}
          {item.key_points ? (
            <div className={styles.panel} style={{ padding: 12 }}>
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                <CheckSquare size={14} /> 핵심 포인트
              </h4>
              <p className="text-sm whitespace-pre-line">{item.key_points}</p>
            </div>
          ) : null}
          {item.usage_examples ? (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                <ListOrdered size={14} /> 활용 방법
              </h4>
              <div className="space-y-3">
                {item.usage_examples.split('\n').map((line, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-md bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <p className="text-sm break-all">{renderTextWithLinks(line)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className={styles.modalFooter} style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div className="flex flex-wrap gap-2">
            {onEdit ? (
              <button type="button" className={styles.btnGhost} onClick={onEdit}>
                정보 수정
              </button>
            ) : null}
            {onAdjustStock ? (
              <button type="button" className={styles.btnGhost} onClick={onAdjustStock}>
                재고 조정
              </button>
            ) : null}
          </div>
          <button type="button" className={styles.btnPrimary} onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
