'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { EquipmentRentalRow, EquipmentStockRow } from '@/app/lib/equipment/types';

export function RentEquipmentModal({
  target,
  teacherOptions,
  onClose,
  onConfirm,
}: {
  target: EquipmentStockRow;
  teacherOptions: { id: string; name: string }[];
  onClose: () => void;
  onConfirm: (teacherId: string, qty: number) => void | Promise<void>;
}) {
  const [teacherId, setTeacherId] = useState('');
  const [qty, setQty] = useState('1');
  const [busy, setBusy] = useState(false);

  return (
    <ModalShell title={`대여 — ${target.name}`} onClose={onClose}>
      <p className="text-sm text-slate-600 mb-4">
        현재 대여 가능: <strong className="text-indigo-700">{target.qty_available}개</strong>
      </p>
      <Field label="강사">
        <select
          className="w-full p-3 border border-slate-200 rounded-xl text-sm"
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
      <Field label="대여 수량">
        <input
          className="w-full p-3 border border-slate-200 rounded-xl text-sm"
          type="number"
          min={1}
          max={target.qty_available}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
      </Field>
      <ModalActions
        confirmLabel="대여 확정"
        onCancel={onClose}
        busy={busy}
        onConfirm={async () => {
          const n = parseInt(qty, 10);
          if (!teacherId || !n || n <= 0) return;
          setBusy(true);
          try {
            await onConfirm(teacherId, n);
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
  kind,
  onClose,
  onConfirm,
}: {
  target: EquipmentStockRow;
  kind: 'on_hand' | 'quarantine';
  onClose: () => void;
  onConfirm: (delta: number, note: string) => void | Promise<void>;
}) {
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const title = kind === 'on_hand' ? '재고 조정' : '격리 관리';

  return (
    <ModalShell title={`${title} — ${target.name}`} onClose={onClose}>
      <p className="text-xs text-slate-500 mb-3">
        {kind === 'on_hand'
          ? '총보유(T) 변경량을 입력합니다. 양수는 증가, 음수는 감소입니다.'
          : '격리(Q) 수량 변경량을 입력합니다.'}
      </p>
      <Field label="변경 수량">
        <input
          className="w-full p-3 border border-slate-200 rounded-xl text-sm"
          type="number"
          placeholder="예: 3 또는 -2"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
        />
      </Field>
      <Field label="사유 (필수)">
        <textarea
          className="w-full p-3 border border-slate-200 rounded-xl text-sm min-h-[80px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="조정 사유를 입력하세요"
        />
      </Field>
      <ModalActions
        confirmLabel="확정"
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
    <ModalShell title={`반납 — ${catalogName}`} onClose={onClose}>
      {rentals.length > 1 && (
        <Field label="대여 건 선택">
          <select
            className="w-full p-3 border border-slate-200 rounded-xl text-sm"
            value={rentalId}
            onChange={(e) => setRentalId(e.target.value)}
          >
            <option value="">선택</option>
            {rentals.map((r) => (
              <option key={r.rental_id} value={r.rental_id}>
                {new Date(r.opened_at).toLocaleDateString('ko-KR')} · 잔여 {r.qty_outstanding} / {r.qty_lent}
              </option>
            ))}
          </select>
        </Field>
      )}
      {selected && (
        <p className="text-sm text-slate-600 mb-3">
          잔여 대여 수량: <strong>{selected.qty_outstanding}개</strong>
        </p>
      )}
      <Field label="반납 수량">
        <input
          className="w-full p-3 border border-slate-200 rounded-xl text-sm"
          type="number"
          min={1}
          max={maxQty || undefined}
          value={qty}
          disabled={!selected}
          onChange={(e) => setQty(e.target.value)}
        />
      </Field>
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          className="text-xs font-bold text-indigo-600 disabled:opacity-40"
          disabled={!selected || maxQty <= 0}
          onClick={() => setQty(String(maxQty))}
        >
          전체 반납
        </button>
      </div>
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
    <div className="fixed inset-0 z-[400] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="font-black text-lg mb-4 text-slate-900">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
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
    <div className="flex gap-2">
      <button
        type="button"
        className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50"
        disabled={busy || disabled}
        onClick={() => void onConfirm()}
      >
        {confirmLabel}
      </button>
      <button type="button" className="flex-1 py-3 rounded-xl border font-bold" onClick={onCancel}>
        취소
      </button>
    </div>
  );
}
