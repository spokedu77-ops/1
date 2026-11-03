'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { validateStockInput } from '@/app/lib/equipment/openingStockValidation';
import type { EquipmentRentalRow, EquipmentStockRow } from '@/app/lib/equipment/types';
import styles from './equipmentInventory.module.css';

export function StockInputModal({
  target,
  onClose,
  onConfirm,
}: {
  target: EquipmentStockRow;
  onClose: () => void;
  onConfirm: (payload: { qtyOnHandTotal: number }) => Promise<void>;
}) {
  const [warehouse, setWarehouse] = useState('');
  const [busy, setBusy] = useState(false);
  const held = target.legacy_mapping_pending ? null : (target.legacy_qty_held ?? 0);

  const w = warehouse.trim() === '' ? NaN : Number(warehouse);
  const validation = validateStockInput({
    warehouseQty: w,
    confirmedTeacherHeld: held ?? 0,
    legacyMappingPending: target.legacy_mapping_pending === true,
    openingAlreadyConfirmed: target.opening_confirmed,
  });
  const totalPreview = validation.ok ? validation.qtyOnHandTotal : held != null && Number.isSafeInteger(w) ? w + held : null;

  return (
    <ModalShell title={`${target.name} — 재고 입력`} onClose={onClose}>
      <QtyField label="창고 수량" value={warehouse} onChange={setWarehouse} min={0} autoFocus suffix="개" />
      <div className="mb-3 space-y-2 text-sm">
        <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-slate-500">기존 강사 보유</span>
          <span className="font-bold tabular-nums">{held === null ? '확인 필요' : `${held}개`}</span>
        </div>
        <div className="flex justify-between rounded-lg bg-indigo-50 px-3 py-2">
          <span className="text-indigo-800 font-semibold">총보유</span>
          <span className="font-black tabular-nums text-indigo-900">
            {totalPreview != null ? `${totalPreview}개` : '—'}
          </span>
        </div>
      </div>
      {!validation.ok && warehouse.trim() !== '' && (
        <p className="mb-3 text-xs text-red-700">{validation.message}</p>
      )}
      <ModalActions
        confirmLabel="저장"
        onCancel={onClose}
        busy={busy}
        disabled={!validation.ok}
        onConfirm={async () => {
          if (!validation.ok) return;
          setBusy(true);
          try {
            await onConfirm({ qtyOnHandTotal: validation.qtyOnHandTotal });
          } finally {
            setBusy(false);
          }
        }}
      />
    </ModalShell>
  );
}

/** @deprecated use StockInputModal */
export const OpeningStockModal = StockInputModal;

export function RentEquipmentModal({
  preset,
  catalogOptions,
  teacherOptions,
  onClose,
  onConfirm,
}: {
  preset?: Pick<EquipmentStockRow, 'catalog_id' | 'name' | 'qty_available'> | null;
  catalogOptions: { catalog_id: number; name: string; qty_available: number }[];
  teacherOptions: { id: string; name: string }[];
  onClose: () => void;
  onConfirm: (catalogId: number, teacherId: string, qty: number) => void | Promise<void>;
}) {
  const [catalogId, setCatalogId] = useState(preset ? String(preset.catalog_id) : '');
  const [teacherId, setTeacherId] = useState('');
  const [qty, setQty] = useState('1');
  const [busy, setBusy] = useState(false);

  const selectedCatalog =
    preset ??
    catalogOptions.find((c) => c.catalog_id === Number(catalogId)) ??
    null;
  const maxQty = selectedCatalog?.qty_available ?? 0;
  const titleName = preset?.name ?? selectedCatalog?.name ?? '교구';

  const catalogDropdownOptions = useMemo(
    () =>
      catalogOptions
        .filter((c) => c.qty_available > 0)
        .map((c) => ({
          value: String(c.catalog_id),
          label: c.name,
          hint: `대여 가능 ${c.qty_available}개`,
        })),
    [catalogOptions],
  );

  const teacherDropdownOptions = useMemo(
    () =>
      teacherOptions.map((t) => ({
        value: t.id,
        label: t.name,
        avatar: t.name.trim().charAt(0) || '?',
      })),
    [teacherOptions],
  );

  return (
    <ModalShell title="대여 등록" onClose={onClose} wide>
      <div className={styles.modalFormHint}>
        <strong className="text-gray-900">{titleName}</strong>
        {selectedCatalog ? (
          <span className="block mt-1">창고에서 빌릴 수 있는 수량: {maxQty}개</span>
        ) : (
          <span className="block mt-1">교구와 강사를 선택한 뒤 수량을 입력하세요.</span>
        )}
      </div>
      {!preset && (
        <ModalDropdownSelect
          label="대여할 교구"
          placeholder="교구를 선택하세요"
          value={catalogId}
          onChange={setCatalogId}
          options={catalogDropdownOptions}
          searchable={catalogDropdownOptions.length > 6}
        />
      )}
      <ModalDropdownSelect
        label="대상 강사"
        placeholder="강사를 선택하세요"
        value={teacherId}
        onChange={setTeacherId}
        options={teacherDropdownOptions}
        searchable
        showAvatar
      />
      <QtyField label="대여 수량" value={qty} onChange={setQty} min={1} max={maxQty || undefined} suffix="개" />
      <ModalActions
        confirmLabel="대여 확정"
        onCancel={onClose}
        busy={busy}
        disabled={!selectedCatalog || maxQty <= 0}
        onConfirm={async () => {
          const n = parseInt(qty, 10);
          const cid = preset?.catalog_id ?? Number(catalogId);
          if (!teacherId || !cid || !n || n <= 0 || n > maxQty) return;
          setBusy(true);
          try {
            await onConfirm(cid, teacherId, n);
          } finally {
            setBusy(false);
          }
        }}
      />
    </ModalShell>
  );
}

export function AdjustStockModal({
  target,
  onClose,
  onConfirm,
}: {
  target: EquipmentStockRow;
  onClose: () => void;
  onConfirm: (delta: number, note: string) => void | Promise<void>;
}) {
  const [delta, setDelta] = useState('0');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const deltaNum = parseSignedInt(delta);
  const validDelta = deltaNum !== null && deltaNum !== 0;

  return (
    <ModalShell title={`${target.name} — 재고 조정`} onClose={onClose}>
      <p className="text-xs text-slate-500 mb-1">
        현재 창고재고 {target.qty_warehouse}개 · + 늘리기 / − 줄이기
      </p>
      <SignedDeltaField label="변경 수량" value={delta} onChange={setDelta} autoFocus suffix="개" />
      <Field label="사유">
        <input
          className={`${styles.input} ${styles.inputWide}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="조정 사유 (필수)"
        />
      </Field>
      <ModalActions
        confirmLabel="저장"
        onCancel={onClose}
        busy={busy}
        disabled={!note.trim() || !validDelta}
        onConfirm={async () => {
          if (deltaNum === null || deltaNum === 0 || !note.trim()) return;
          setBusy(true);
          try {
            await onConfirm(deltaNum, note.trim());
          } finally {
            setBusy(false);
          }
        }}
      />
    </ModalShell>
  );
}

export function ReturnEquipmentModal({
  catalogName,
  rentals,
  onClose,
  onConfirm,
}: {
  catalogName: string;
  rentals: EquipmentRentalRow[];
  onClose: () => void;
  onConfirm: (rentalId: string, qty: number) => void | Promise<void>;
}) {
  const [rentalId, setRentalId] = useState('');
  const [qty, setQty] = useState('1');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (rentals.length === 1) {
      setRentalId(rentals[0].rental_id);
    } else {
      setRentalId('');
    }
    setQty('1');
  }, [rentals]);

  const selected = useMemo(
    () => rentals.find((r) => r.rental_id === rentalId) ?? null,
    [rentals, rentalId],
  );
  const maxQty = selected?.qty_outstanding ?? 0;

  const rentalDropdownOptions = useMemo(
    () =>
      rentals.map((r) => ({
        value: r.rental_id,
        label: r.teacher_name ?? '강사',
        hint: `${new Date(r.opened_at).toLocaleDateString('ko-KR')} · 잔여 ${r.qty_outstanding}개`,
      })),
    [rentals],
  );

  return (
    <ModalShell title={`${catalogName} — 반납`} onClose={onClose} wide>
      {rentals.length > 1 && (
        <ModalDropdownSelect
          label="반납할 대여 건"
          placeholder="대여 건을 선택하세요"
          value={rentalId}
          onChange={setRentalId}
          options={rentalDropdownOptions}
          searchable={rentalDropdownOptions.length > 5}
        />
      )}
      {selected && (
        <div className={styles.modalFormHint}>
          {selected.teacher_name ?? '강사'} · 현재 보유 <strong>{selected.qty_outstanding}개</strong>
        </div>
      )}
      <QtyField label="반납 수량" value={qty} onChange={setQty} min={1} max={maxQty || undefined} suffix="개" disabled={!selected} />
      <ModalActions
        confirmLabel="반납 확정"
        onCancel={onClose}
        busy={busy}
        disabled={!selected || !qty || parseInt(qty, 10) <= 0 || parseInt(qty, 10) > maxQty}
        onConfirm={async () => {
          if (!selected) return;
          const n = parseInt(qty, 10);
          if (!n || n <= 0 || n > selected.qty_outstanding) return;
          setBusy(true);
          try {
            await onConfirm(selected.rental_id, n);
          } finally {
            setBusy(false);
          }
        }}
      />
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={wide ? styles.modalCardWide : styles.modalCard}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button type="button" className={`${styles.btnGhost} ${styles.btnSm}`} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

export type TeacherHoldingGroup = {
  catalog_id: number;
  catalog_name: string;
  qty_outstanding: number;
  rentals: EquipmentRentalRow[];
};

export function TeacherHoldingsModal({
  teacherName,
  holdings,
  ledgerReady,
  onClose,
  onPartialReturn,
  onBulkReturnFull,
}: {
  teacherName: string;
  holdings: TeacherHoldingGroup[];
  ledgerReady: boolean;
  onClose: () => void;
  /** 수량·대여 건을 지정하는 부분 반납 */
  onPartialReturn: (group: TeacherHoldingGroup) => void;
  /** 선택 품목 미반납 전량 일괄 반납 */
  onBulkReturnFull: (groups: TeacherHoldingGroup[]) => void | Promise<void>;
}) {
  const returnable = useMemo(
    () => holdings.filter((g) => g.qty_outstanding > 0),
    [holdings],
  );
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelected(new Set(returnable.map((g) => g.catalog_id)));
  }, [holdings, returnable]);

  const selectedGroups = useMemo(
    () => returnable.filter((g) => selected.has(g.catalog_id)),
    [returnable, selected],
  );
  const allChecked = returnable.length > 0 && selectedGroups.length === returnable.length;
  const someChecked = selectedGroups.length > 0 && !allChecked;

  const toggleOne = (catalogId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(catalogId)) next.delete(catalogId);
      else next.add(catalogId);
      return next;
    });
  };

  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(returnable.map((g) => g.catalog_id)));
  };

  const selectedQty = selectedGroups.reduce((s, g) => s + g.qty_outstanding, 0);

  return (
    <ModalShell title={`${teacherName} 선생님 대여 현황`} onClose={onClose} wide>
      <p className="text-xs text-gray-500">
        반납할 교구를 선택한 뒤 <strong>선택 전량 반납</strong>을 누르세요. 일부만 돌려줄 때는 <strong>부분</strong>을
        사용하세요.
      </p>
      <div className={styles.tableWrap} style={{ maxHeight: Math.min(480, typeof window !== 'undefined' ? window.innerHeight * 0.5 : 480) }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkCol}>
                {ledgerReady && returnable.length > 0 ? (
                  <input
                    type="checkbox"
                    className={styles.rowCheck}
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked;
                    }}
                    aria-label="전체 선택"
                    onChange={toggleAll}
                  />
                ) : null}
              </th>
              <th className={styles.textLeft}>품명</th>
              <th className={styles.textRight}>미반납</th>
              <th>부분</th>
            </tr>
          </thead>
          <tbody>
            {holdings.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyState} style={{ padding: 20 }}>
                  현재 대여 중인 교구가 없습니다.
                </td>
              </tr>
            ) : (
              holdings.map((group) => {
                const canReturn = ledgerReady && group.qty_outstanding > 0;
                return (
                  <tr key={group.catalog_id}>
                    <td className={styles.checkCol}>
                      {canReturn ? (
                        <input
                          type="checkbox"
                          className={styles.rowCheck}
                          checked={selected.has(group.catalog_id)}
                          aria-label={`${group.catalog_name} 선택`}
                          onChange={() => toggleOne(group.catalog_id)}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={styles.textLeft}>
                      <b>{group.catalog_name}</b>
                    </td>
                    <td className={styles.textRight}>{group.qty_outstanding}</td>
                    <td>
                      {canReturn ? (
                        <button
                          type="button"
                          className={`${styles.btnGhost} ${styles.btnSm}`}
                          onClick={() => onPartialReturn(group)}
                        >
                          부분
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className={styles.bulkActionBar}>
        <label className={styles.bulkSelectLabel}>
          <input
            type="checkbox"
            className={styles.rowCheck}
            checked={allChecked}
            disabled={!ledgerReady || returnable.length === 0}
            ref={(el) => {
              if (el) el.indeterminate = someChecked;
            }}
            onChange={toggleAll}
          />
          {selectedGroups.length}종 선택 · 총 {selectedQty}개
        </label>
        <div className={styles.bulkActionButtons}>
          <button type="button" className={styles.btnGhost} onClick={onClose} disabled={busy}>
            닫기
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={!ledgerReady || selectedGroups.length === 0 || busy}
            onClick={() => {
              void (async () => {
                setBusy(true);
                try {
                  await onBulkReturnFull(selectedGroups);
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            {busy ? '반납 처리 중…' : `선택 전량 반납 (${selectedGroups.length}종)`}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-2.5">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

type DropdownOption = {
  value: string;
  label: string;
  hint?: string;
  avatar?: string;
};

type DropdownMenuLayout = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function computeDropdownMenuLayout(trigger: HTMLElement): DropdownMenuLayout {
  const r = trigger.getBoundingClientRect();
  const margin = 12;
  const cap = Math.min(440, window.innerHeight * 0.55);
  const spaceBelow = window.innerHeight - r.bottom - margin;
  const spaceAbove = r.top - margin;
  const openDown = spaceBelow >= 280 || spaceBelow >= spaceAbove;
  const maxHeight = Math.min(cap, Math.max(280, openDown ? spaceBelow - 8 : spaceAbove - 8));
  const top = openDown ? r.bottom + 6 : Math.max(margin, r.top - maxHeight - 6);
  return { top, left: r.left, width: r.width, maxHeight };
}

function ModalDropdownSelect({
  label,
  placeholder,
  value,
  onChange,
  options,
  searchable = false,
  showAvatar = false,
  disabled = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  searchable?: boolean;
  showAvatar?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuLayout, setMenuLayout] = useState<DropdownMenuLayout | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.hint ?? '').toLowerCase().includes(q),
    );
  }, [options, query]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setQuery('');
    setMenuLayout(null);
  }, []);

  const syncMenuLayout = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    setMenuLayout(computeDropdownMenuLayout(el));
  }, []);

  useEffect(() => {
    if (!open) return;
    syncMenuLayout();
    const onLayout = () => syncMenuLayout();
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [open, syncMenuLayout]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, closeMenu]);

  const showSearch = searchable && options.length > 2;

  const menuPanel = (
    <div
      ref={menuRef}
      className={styles.dropdownMenuFixed}
      role="listbox"
      style={
        menuLayout
          ? {
              top: menuLayout.top,
              left: menuLayout.left,
              width: menuLayout.width,
              maxHeight: menuLayout.maxHeight,
            }
          : { visibility: 'hidden' as const }
      }
    >
      {showSearch ? (
        <div className={styles.dropdownSearchWrap}>
          <input
            type="search"
            className={styles.dropdownSearch}
            placeholder="이름 검색"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      ) : null}
      {filtered.length === 0 ? (
        <p className={styles.dropdownEmpty}>일치하는 항목이 없습니다.</p>
      ) : (
        filtered.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={active}
              className={`${styles.dropdownItem} ${active ? styles.dropdownItemActive : ''}`}
              onClick={() => {
                onChange(opt.value);
                closeMenu();
              }}
            >
              {showAvatar && opt.avatar ? (
                <span className={styles.dropdownItemAvatar}>{opt.avatar}</span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {opt.label}
                  {showAvatar ? ' 선생님' : ''}
                </span>
                {opt.hint ? <span className="block text-xs text-gray-500 truncate">{opt.hint}</span> : null}
              </span>
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <Field label={label}>
      <div className={styles.dropdownRoot}>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled || options.length === 0}
          className={styles.dropdownTrigger}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => {
            if (disabled || options.length === 0) return;
            if (open) closeMenu();
            else {
              setOpen(true);
              requestAnimationFrame(() => syncMenuLayout());
            }
          }}
        >
          <span className="flex items-center gap-2 min-w-0 flex-1">
            {selected && showAvatar && selected.avatar ? (
              <span className={styles.dropdownItemAvatar}>{selected.avatar}</span>
            ) : null}
            <span className={`truncate ${selected ? '' : styles.dropdownTriggerPlaceholder}`}>
              {selected ? `${selected.label}${showAvatar ? ' 선생님' : ''}` : placeholder}
            </span>
          </span>
          <ChevronDown size={16} className={`${styles.dropdownChevron} ${open ? styles.dropdownChevronOpen : ''}`} />
        </button>
        {open && typeof document !== 'undefined' ? createPortal(menuPanel, document.body) : null}
      </div>
    </Field>
  );
}

function parseSignedInt(raw: string): number | null {
  const t = raw.trim();
  if (t === '' || t === '-') return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function SignedDeltaField({
  label,
  value,
  onChange,
  autoFocus,
  suffix,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  suffix?: string;
  disabled?: boolean;
}) {
  const n = parseSignedInt(value) ?? 0;

  const bump = (step: number) => {
    onChange(String(n + step));
  };

  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          className={`${styles.btnGhost} ${styles.btnSm}`}
          style={{ width: 36, height: 36, padding: 0, fontSize: 18 }}
          aria-label="1 감소"
          onClick={() => bump(-1)}
        >
          −
        </button>
        <div
          className="flex-1 flex items-center justify-center gap-1 rounded-md border border-gray-200 bg-white px-2"
          style={{ minHeight: 36 }}
        >
          <input
            type="text"
            inputMode="numeric"
            value={value}
            disabled={disabled}
            autoFocus={autoFocus}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || v === '-' || /^-?\d*$/.test(v)) onChange(v);
            }}
            onBlur={() => {
              const parsed = parseSignedInt(value);
              if (parsed === null) onChange('0');
            }}
            className="w-full py-2 text-sm text-center tabular-nums border-0 focus:outline-none focus:ring-0"
          />
          {suffix ? <span className="text-xs text-gray-400 shrink-0">{suffix}</span> : null}
        </div>
        <button
          type="button"
          disabled={disabled}
          className={`${styles.btnPrimary} ${styles.btnSm}`}
          style={{ width: 36, height: 36, padding: 0, fontSize: 18 }}
          aria-label="1 증가"
          onClick={() => bump(1)}
        >
          +
        </button>
      </div>
    </Field>
  );
}

function QtyField({
  label,
  value,
  onChange,
  min,
  max,
  autoFocus,
  suffix,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  autoFocus?: boolean;
  suffix?: string;
  disabled?: boolean;
}) {
  const n = parseInt(value, 10) || 0;
  const bump = (delta: number) => {
    const next = Math.max(min ?? 0, n + delta);
    if (max != null) onChange(String(Math.min(max, next)));
    else onChange(String(next));
  };
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          className="w-9 h-9 rounded-lg border font-bold text-slate-600 disabled:opacity-40"
          onClick={() => bump(-1)}
        >
          −
        </button>
        <div className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2">
          <input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={value}
            disabled={disabled}
            autoFocus={autoFocus}
            onChange={(e) => onChange(e.target.value)}
            className="w-full py-2.5 text-sm text-center tabular-nums border-0 focus:ring-0"
          />
          {suffix ? <span className="text-xs text-slate-400 shrink-0">{suffix}</span> : null}
        </div>
        <button
          type="button"
          disabled={disabled}
          className="w-9 h-9 rounded-lg border font-bold text-slate-600 disabled:opacity-40"
          onClick={() => bump(1)}
        >
          +
        </button>
      </div>
    </Field>
  );
}

function ModalActions({
  confirmLabel,
  onCancel,
  onConfirm,
  busy,
  disabled,
}: {
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={styles.modalFooter}>
      <button type="button" className={styles.btnGhost} onClick={onCancel}>
        취소
      </button>
      <button
        type="button"
        className={styles.btnPrimary}
        disabled={busy || disabled}
        onClick={() => void onConfirm()}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
