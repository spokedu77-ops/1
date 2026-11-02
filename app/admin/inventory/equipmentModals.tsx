'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { validateStockInput } from '@/app/lib/equipment/openingStockValidation';
import type { EquipmentRentalRow, EquipmentStockRow } from '@/app/lib/equipment/types';

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

  return (
    <ModalShell title={`${titleName} — 대여`} onClose={onClose}>
      {!preset && (
        <Field label="교구">
          <select
            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            value={catalogId}
            onChange={(e) => setCatalogId(e.target.value)}
          >
            <option value="">선택</option>
            {catalogOptions
              .filter((c) => c.qty_available > 0)
              .map((c) => (
                <option key={c.catalog_id} value={c.catalog_id}>
                  {c.name} (가능 {c.qty_available})
                </option>
              ))}
          </select>
        </Field>
      )}
      <Field label="강사">
        <select
          className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
        >
          <option value="">선택</option>
          {teacherOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      <QtyField label="대여 수량" value={qty} onChange={setQty} min={1} max={maxQty || undefined} suffix="개" />
      <p className="text-xs text-slate-500 mb-2">대여 가능 {maxQty}개</p>
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
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <ModalShell title={`${target.name} — 재고 조정`} onClose={onClose}>
      <Field label="변경 수량">
        <input
          className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
          type="number"
          placeholder="예: 3 또는 -2"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
        />
      </Field>
      <Field label="사유">
        <input
          className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="조정 사유"
        />
      </Field>
      <ModalActions
        confirmLabel="저장"
        onCancel={onClose}
        busy={busy}
        disabled={!note.trim() || !delta || parseInt(delta, 10) === 0}
        onConfirm={async () => {
          const n = parseInt(delta, 10);
          if (!n || n === 0 || !note.trim()) return;
          setBusy(true);
          try {
            await onConfirm(n, note.trim());
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

  return (
    <ModalShell title={`${catalogName} — 반납`} onClose={onClose}>
      {rentals.length > 1 && (
        <Field label="대여 건">
          <select
            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            value={rentalId}
            onChange={(e) => setRentalId(e.target.value)}
          >
            <option value="">선택</option>
            {rentals.map((r) => (
              <option key={r.rental_id} value={r.rental_id}>
                {new Date(r.opened_at).toLocaleDateString('ko-KR')} · 잔여 {r.qty_outstanding}개
              </option>
            ))}
          </select>
        </Field>
      )}
      {selected && (
        <p className="text-xs text-slate-600 mb-2">
          {catalogName} · 현재 보유 {selected.qty_outstanding}개
        </p>
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
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[400] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-sm shadow-xl max-sm:max-h-[85vh] max-sm:overflow-y-auto sm:overflow-visible"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="font-black text-base mb-3 text-slate-900">{title}</h3>
        {children}
      </div>
    </div>
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
    <div className="flex gap-2 pt-1">
      <button type="button" className="flex-1 py-2.5 rounded-xl border text-sm font-bold" onClick={onCancel}>
        취소
      </button>
      <button
        type="button"
        className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50"
        disabled={busy || disabled}
        onClick={() => void onConfirm()}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
