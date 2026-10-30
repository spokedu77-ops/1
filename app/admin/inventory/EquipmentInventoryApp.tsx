'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { History, Package, Plus, RotateCcw, UserCircle2 } from 'lucide-react';
import type { EquipmentLedgerRow, EquipmentRentalRow, EquipmentStockRow } from '@/app/lib/equipment/types';
import { CatalogDetailModal, type CatalogDetailShape } from './equipmentUiShared';
import { CatalogEditorModal, type CatalogFormState } from './CatalogEditorModal';
import { LegacyInventoryClient } from './LegacyInventoryClient';
import type { LegacyEquipmentCatalogItem, LegacyEquipmentHistoryItem, LegacyEquipmentInventoryItem } from '@/app/lib/equipment/legacyReads';

type TabId = 'stock' | 'teachers' | 'history';

type TeacherRow = {
  id: string;
  name: string;
  ledger_sku_count?: number;
  ledger_total_held?: number;
  inventory_item_count?: number;
  inventory_total_held?: number;
};

export function EquipmentInventoryApp() {
  const [tab, setTab] = useState<TabId>('stock');
  const [ledgerWrites, setLedgerWrites] = useState(false);
  const [isLegacy, setIsLegacy] = useState(false);
  const [showLegacyEditor, setShowLegacyEditor] = useState(false);
  const [legacyCatalog, setLegacyCatalog] = useState<LegacyEquipmentCatalogItem[]>([]);
  const [legacyInventory, setLegacyInventory] = useState<LegacyEquipmentInventoryItem[]>([]);
  const [legacyHistory, setLegacyHistory] = useState<LegacyEquipmentHistoryItem[]>([]);
  const [stock, setStock] = useState<EquipmentStockRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [history, setHistory] = useState<EquipmentLedgerRow[]>([]);
  const [rentals, setRentals] = useState<EquipmentRentalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<CatalogDetailShape | null>(null);
  const [catalogEdit, setCatalogEdit] = useState<{ id: number | null; form: CatalogFormState | null } | null>(null);
  const [rentTarget, setRentTarget] = useState<EquipmentStockRow | null>(null);
  const [rentTeacherId, setRentTeacherId] = useState('');
  const [rentQty, setRentQty] = useState('1');
  const [stockQuery, setStockQuery] = useState('');

  const refreshStock = useCallback(async () => {
    const res = await fetch('/api/admin/equipment/stock', { cache: 'no-store' });
    if (!res.ok) throw new Error('stock fetch failed');
    const body = (await res.json()) as {
      items: EquipmentStockRow[];
      data_source?: 'legacy' | 'ledger';
      catalog_items?: LegacyEquipmentCatalogItem[];
      capabilities?: { ledger_writes?: boolean };
    };
    setStock(body.items ?? []);
    setIsLegacy(body.data_source === 'legacy');
    setLegacyCatalog(body.catalog_items ?? []);
    setLedgerWrites(body.capabilities?.ledger_writes === true);
  }, []);

  const refreshTeachers = useCallback(async () => {
    const res = await fetch('/api/admin/equipment/teachers', { cache: 'no-store' });
    if (!res.ok) throw new Error('teachers fetch failed');
    const body = (await res.json()) as { items: TeacherRow[] };
    setTeachers(body.items ?? []);
  }, []);

  const refreshHistory = useCallback(async () => {
    const params = new URLSearchParams({ limit: '100' });
    if (selectedTeacherId) params.set('teacher_id', selectedTeacherId);
    const res = await fetch(`/api/admin/equipment/history?${params}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('history fetch failed');
    const body = (await res.json()) as { items: EquipmentLedgerRow[]; history_items?: LegacyEquipmentHistoryItem[] };
    setHistory(body.items ?? []);
    setLegacyHistory(body.history_items ?? []);
  }, [selectedTeacherId]);

  const refreshRentals = useCallback(async (teacherId: string, signal?: AbortSignal) => {
    setRentals([]);
    setLegacyInventory([]);
    const res = await fetch(
      `/api/admin/equipment/rentals?teacher_id=${encodeURIComponent(teacherId)}&active=true`,
      { cache: 'no-store', signal },
    );
    if (!res.ok) throw new Error('rentals fetch failed');
    const body = (await res.json()) as { items: EquipmentRentalRow[]; inventory_items?: LegacyEquipmentInventoryItem[] };
    if (signal?.aborted) return;
    setRentals(body.items ?? []);
    setLegacyInventory(body.inventory_items ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([refreshStock(), refreshTeachers()])
      .catch(() => toast.error('교구 데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [refreshStock, refreshTeachers]);

  useEffect(() => {
    if (tab === 'history') {
      void refreshHistory().catch(() => toast.error('이력을 불러오지 못했습니다.'));
    }
  }, [tab, refreshHistory]);

  useEffect(() => {
    if (tab === 'teachers' && selectedTeacherId) {
      const controller = new AbortController();
      void refreshRentals(selectedTeacherId, controller.signal).catch(() => {
        if (!controller.signal.aborted) toast.error('보유 내역을 불러오지 못했습니다.');
      });
      return () => controller.abort();
    }
  }, [tab, selectedTeacherId, refreshRentals]);

  const teacherOptions = useMemo(
    () => teachers.map((t) => ({ id: t.id, name: t.name })),
    [teachers],
  );

  const filteredStock = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    if (!q) return stock;
    return stock.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (row.mgmt_code ?? '').toLowerCase().includes(q) ||
        (row.category ?? '').toLowerCase().includes(q),
    );
  }, [stock, stockQuery]);

  const postJson = async (url: string, payload: Record<string, unknown>) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    if (!res.ok) throw new Error(body.error ?? '요청 실패');
    return body;
  };

  const handleRent = async () => {
    if (!rentTarget || !rentTeacherId) return;
    const qty = parseInt(rentQty, 10);
    if (!qty || qty <= 0) {
      toast.error('수량을 확인하세요.');
      return;
    }
    try {
      await postJson('/api/admin/equipment/rent', {
        catalog_id: rentTarget.catalog_id,
        teacher_id: rentTeacherId,
        qty,
        request_key: crypto.randomUUID(),
      });
      toast.success('대여가 등록되었습니다.');
      setRentTarget(null);
      await refreshStock();
      if (selectedTeacherId) await refreshRentals(selectedTeacherId);
      if (tab === 'history') await refreshHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '대여 실패');
    }
  };

  const handleReturn = async (rental: EquipmentRentalRow, qty: number) => {
    try {
      await postJson('/api/admin/equipment/return', {
        rental_id: rental.rental_id,
        qty,
        request_key: crypto.randomUUID(),
      });
      toast.success('반납이 확인되었습니다.');
      await refreshStock();
      if (selectedTeacherId) await refreshRentals(selectedTeacherId);
      if (tab === 'history') await refreshHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '반납 실패');
    }
  };

  const handleAdjust = async (row: EquipmentStockRow, delta: number, kind: 'on_hand' | 'quarantine') => {
    const note = window.prompt(kind === 'on_hand' ? '총보유 조정 사유' : '격리 조정 사유');
    if (note === null) return;
    try {
      await postJson('/api/admin/equipment/adjust', {
        catalog_id: row.catalog_id,
        delta,
        kind,
        note,
        request_key: crypto.randomUUID(),
      });
      toast.success('재고가 조정되었습니다.');
      await refreshStock();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '조정 실패');
    }
  };

  const openEdit = (row: LegacyEquipmentCatalogItem & { mgmt_code?: string | null }) => {
    setCatalogEdit({
      id: row.catalog_id,
      form: {
        name: row.name,
        category: row.category ?? '',
        image: row.image ?? '',
        simple_desc: row.simple_desc ?? '',
        key_points: row.key_points ?? '',
        usage_examples: row.usage_examples ?? '',
        mgmt_code: row.mgmt_code ?? '',
      },
    });
  };

  if (showLegacyEditor) {
    return <div>
      <button type="button" className="m-4 px-4 py-2 rounded-xl border font-bold" onClick={() => {
        setShowLegacyEditor(false);
        void Promise.all([refreshStock(), refreshTeachers()]).catch(() => toast.error('교구 데이터를 불러오지 못했습니다.'));
        if (selectedTeacherId) void refreshRentals(selectedTeacherId).catch(() => toast.error('보유 내역을 불러오지 못했습니다.'));
        if (tab === 'history') void refreshHistory().catch(() => toast.error('이력을 불러오지 못했습니다.'));
      }}>교구 재고 · 강사 목록 · 이력으로 돌아가기</button>
      <LegacyInventoryClient />
    </div>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <p className="text-sm font-bold text-slate-400">교구 수불 데이터 불러오는 중…</p>
      </div>
    );
  }

  const writes = ledgerWrites;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-4 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package className="text-indigo-600" size={22} />
            <h1 className="text-lg font-black text-slate-900">교구 수불관리</h1>
          </div>
          {isLegacy ? (
            <button type="button" onClick={() => setShowLegacyEditor(true)} className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-2 rounded-full border border-indigo-200">
              기존 재고 수량 관리
            </button>
          ) : !writes && (
            <p className="text-xs text-amber-700">재고 변경 권한이 비활성화되어 있습니다.</p>
          )}
        </div>
        <div className="mt-4 inline-flex gap-1 p-1 rounded-full bg-slate-100 border border-slate-200" role="tablist">
          {(
            [
              ['stock', '교구 재고'],
              ['teachers', '강사 목록'],
              ['history', '대여·반납 이력'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`min-h-[40px] px-4 py-2 rounded-full text-sm font-semibold ${
                tab === id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        {tab === 'stock' && (
          <div className="space-y-4">
            {ledgerWrites && stock.some((r) => !r.opening_confirmed) && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                기초재고(OPENING)가 확정되지 않은 품목은 가용 수량을 표시하지 않으며 대여할 수 없습니다.
              </p>
            )}
            {stock.some((r) => r.cache_drift) && (
              <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                재고 캐시 불일치가 탐지된 품목이 있습니다. 수불 쓰기가 차단됩니다. (자동 보정 없음)
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <input
                type="search"
                placeholder={isLegacy ? '교구명·카테고리 검색' : '교구명·관리번호·카테고리 검색'}
                value={stockQuery}
                onChange={(e) => setStockQuery(e.target.value)}
                className="flex-1 min-w-[200px] max-w-md p-3 rounded-xl border border-slate-200 bg-white text-sm"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCatalogEdit({ id: null, form: null })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold"
              >
                <Plus size={16} /> 교구 등록
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    <th className="p-3">교구</th>
                    {isLegacy ? <th className="p-3">카테고리</th> : <>
                    <th className="p-3">관리번호</th>
                    <th className="p-3 text-right">총(T)</th>
                    <th className="p-3 text-right">대여(L)</th>
                    <th className="p-3 text-right">격리(Q)</th>
                    <th className="p-3 text-right">가용(A)</th>
                    </>}
                    <th className="p-3">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {isLegacy ? legacyCatalog.filter((row) => `${row.name} ${row.category ?? ''}`.toLowerCase().includes(stockQuery.trim().toLowerCase())).map((row) => (
                    <tr key={row.catalog_id} className="border-t border-slate-100">
                      <td className="p-3 font-semibold">{row.name}</td>
                      <td className="p-3 text-slate-500">{row.category ?? '—'}</td>
                      <td className="p-3 space-x-2 whitespace-nowrap">
                        <button type="button" className="text-xs font-bold text-indigo-600" onClick={() => setDetailItem(row)}>상세</button>
                        <button type="button" className="text-xs font-bold text-slate-600" onClick={() => openEdit(row)}>수정</button>
                      </td>
                    </tr>
                  )) : filteredStock.map((row) => {
                    const showQty = row.opening_confirmed && !row.cache_drift;
                    const canMutate = writes && showQty;
                    return (
                    <tr key={row.catalog_id} className="border-t border-slate-100">
                      <td className="p-3 font-semibold">
                        {row.name}
                        {!row.opening_confirmed && ledgerWrites ? (
                          <span className="ml-2 text-[10px] font-bold text-amber-600 uppercase">OPENING 미확정</span>
                        ) : null}
                        {row.cache_drift ? (
                          <span className="ml-2 text-[10px] font-bold text-red-600 uppercase">캐시 불일치</span>
                        ) : null}
                      </td>
                      <td className="p-3 text-slate-500">{row.mgmt_code ?? '—'}</td>
                      <td className="p-3 text-right tabular-nums">{showQty ? row.qty_on_hand_total : '—'}</td>
                      <td className="p-3 text-right tabular-nums">{showQty ? row.qty_lent : '—'}</td>
                      <td className="p-3 text-right tabular-nums">{showQty ? row.qty_quarantine : '—'}</td>
                      <td className="p-3 text-right tabular-nums font-bold text-indigo-700">{showQty ? row.qty_available : '—'}</td>
                      <td className="p-3 flex flex-wrap gap-1">
                        <button type="button" className="text-xs text-indigo-600 font-bold" onClick={() => setDetailItem(row)}>
                          상세
                        </button>
                        <button type="button" className="text-xs text-slate-600" onClick={() => openEdit(row)}>
                          수정
                        </button>
                        {canMutate && (
                          <>
                            <button type="button" className="text-xs text-indigo-600" onClick={() => { setRentTarget(row); setRentTeacherId(''); setRentQty('1'); }}>
                              대여
                            </button>
                            <button type="button" className="text-xs text-slate-600" onClick={() => void handleAdjust(row, 1, 'on_hand')}>
                              T+1
                            </button>
                            <button type="button" className="text-xs text-slate-600" onClick={() => void handleAdjust(row, -1, 'on_hand')}>
                              T−1
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
            {isLegacy && <p className="text-xs text-slate-500">강사별 실제 보유 수량은 강사 목록에서 확인하세요. 기존 재고에는 창고 총량·대여 수량 구분이 없어 임의로 계산하지 않습니다.</p>}
          </div>
        )}

        {tab === 'teachers' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-2">
              {teachers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTeacherId(t.id)}
                  className={`w-full text-left p-4 rounded-2xl border ${
                    selectedTeacherId === t.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserCircle2 size={18} className="text-indigo-600" />
                    <span className="font-bold">{t.name}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    품목 {isLegacy ? t.inventory_item_count : t.ledger_sku_count} · 보유 {isLegacy ? t.inventory_total_held : t.ledger_total_held}개
                  </p>
                </button>
              ))}
            </div>
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 min-h-[240px]">
              {!selectedTeacherId ? (
                <p className="text-slate-400 text-sm">강사를 선택하세요.</p>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-black text-slate-800">{isLegacy ? '보유 교구' : '활성 대여'}</h3>
                  {isLegacy ? (
                    legacyInventory.length === 0 ? <p className="text-sm text-slate-400">보유 교구가 없습니다.</p> : legacyInventory.map((item) => (
                      <div key={item.id} className="flex justify-between gap-2 border border-slate-100 rounded-xl p-3">
                        <span className="font-bold">{item.name}</span><span>보유 {item.quantity ?? 0}개</span>
                      </div>
                    ))
                  ) : rentals.length === 0 ? (
                    <p className="text-sm text-slate-400">활성 대여가 없습니다.</p>
                  ) : (
                    rentals.map((r) => (
                      <div key={r.rental_id} className="flex flex-wrap items-center justify-between gap-2 border border-slate-100 rounded-xl p-3">
                        <div>
                          <p className="font-bold">{r.catalog_name}</p>
                          <p className="text-xs text-slate-500">
                            잔량 {r.qty_outstanding} / {r.qty_lent} · {new Date(r.opened_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        {writes && r.qty_outstanding > 0 && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="text-xs font-bold text-indigo-600 flex items-center gap-1"
                              onClick={() => void handleReturn(r, 1)}
                            >
                              <RotateCcw size={12} /> 1 반납
                            </button>
                            <button
                              type="button"
                              className="text-xs font-bold text-rose-600"
                              onClick={() => void handleReturn(r, r.qty_outstanding)}
                            >
                              전량
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
              <History size={16} className="text-slate-400" />
              <span className="text-xs font-black text-slate-500">{isLegacy ? '기존 재고 변경 이력' : '대여·반납 이력'}</span>
            </div>
            <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {isLegacy ? (
                legacyHistory.length === 0 ? <li className="p-6 text-sm text-slate-400">이력이 없습니다.</li> : legacyHistory.map((item) => (
                  <li key={item.id} className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-bold text-slate-800">{teachers.find((teacher) => teacher.id === item.user_id)?.name ?? '—'}</span>
                      <time className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString('ko-KR')}</time>
                    </div>
                    <p className="text-slate-600 whitespace-pre-line">{item.content}</p>
                  </li>
                ))
              ) : history.length === 0 ? (
                <li className="p-6 text-sm text-slate-400">이력이 없습니다.</li>
              ) : (
                history.map((h) => (
                  <li key={h.ledger_id} className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-bold text-slate-800">{h.event_type}</span>
                      <time className="text-xs text-slate-400">{new Date(h.occurred_at).toLocaleString('ko-KR')}</time>
                    </div>
                    <p className="text-slate-600">
                      {h.catalog_name ?? h.catalog_id} · qty {h.qty}
                      {h.teacher_name ? ` · ${h.teacher_name}` : ''}
                    </p>
                    {h.note && <p className="text-xs text-slate-400">{h.note}</p>}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </main>

      {detailItem && (
        <CatalogDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
        />
      )}

      {catalogEdit && (
        <CatalogEditorModal
          editingId={catalogEdit.id}
          initial={catalogEdit.form}
          supportsManagementCode={!isLegacy}
          onClose={() => setCatalogEdit(null)}
          onSaved={() => void refreshStock()}
        />
      )}

      {rentTarget && writes && (
        <div className="fixed inset-0 z-[400] bg-black/40 flex items-center justify-center p-4" onClick={() => setRentTarget(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-lg mb-4">대여 — {rentTarget.name}</h3>
            <label className="text-xs font-bold text-slate-500">강사</label>
            <select className="w-full mt-1 mb-3 p-3 border rounded-xl" value={rentTeacherId} onChange={(e) => setRentTeacherId(e.target.value)}>
              <option value="">선택</option>
              {teacherOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <label className="text-xs font-bold text-slate-500">수량 (가용 {rentTarget.qty_available})</label>
            <input className="w-full mt-1 mb-4 p-3 border rounded-xl" type="number" min={1} value={rentQty} onChange={(e) => setRentQty(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold" onClick={() => void handleRent()}>
                대여
              </button>
              <button type="button" className="flex-1 py-3 rounded-xl border font-bold" onClick={() => setRentTarget(null)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
