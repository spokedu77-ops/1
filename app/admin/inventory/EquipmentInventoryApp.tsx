'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { History, Package, Plus, UserCircle2 } from 'lucide-react';
import type { EquipmentCapabilities } from '@/app/lib/equipment/capabilities';
import {
  resolveInventoryConnectionState,
  SCHEMA_MISSING_USER_MESSAGE,
  type EquipmentInventoryConnectionState,
} from '@/app/lib/equipment/inventoryConnectionState';
import { equipmentEventTypeLabel } from '@/app/lib/equipment/ledgerLabels';
import type { EquipmentLedgerRow, EquipmentRentalRow, EquipmentStockRow } from '@/app/lib/equipment/types';
import type { LegacyEquipmentHistoryItem, LegacyEquipmentInventoryItem } from '@/app/lib/equipment/legacyReads';
import {
  CatalogDetailModal,
  type CatalogDetailShape,
  type CatalogTeacherHolding,
} from './equipmentUiShared';
import { CatalogEditorModal, type CatalogFormState } from './CatalogEditorModal';
import { AdjustStockModal, RentEquipmentModal, ReturnEquipmentModal } from './equipmentModals';
import {
  canShowStockQty,
  EquipmentStockCards,
  EquipmentStockTable,
  getStockDisplayStatus,
  stockStatusLabel,
} from './equipmentStockUi';

type TabId = 'stock' | 'teachers' | 'history';

type TeacherRow = {
  id: string;
  name: string;
  ledger_sku_count?: number;
  ledger_total_held?: number;
  inventory_item_count?: number;
  inventory_total_held?: number;
};

type CatalogHoldingGroup = {
  catalog_id: number;
  catalog_name: string;
  qty_outstanding: number;
  rentals: EquipmentRentalRow[];
};

const defaultCapabilities: EquipmentCapabilities = {
  server_write_mode: 'legacy',
  ledger_writes: false,
  legacy_direct_writes_blocked: null,
};

export function EquipmentInventoryApp() {
  const [tab, setTab] = useState<TabId>('stock');
  const [capabilities, setCapabilities] = useState<EquipmentCapabilities>(defaultCapabilities);
  const [legacyInventory, setLegacyInventory] = useState<LegacyEquipmentInventoryItem[]>([]);
  const [legacyHistory, setLegacyHistory] = useState<LegacyEquipmentHistoryItem[]>([]);
  const [stock, setStock] = useState<EquipmentStockRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [history, setHistory] = useState<EquipmentLedgerRow[]>([]);
  const [rentals, setRentals] = useState<EquipmentRentalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<(CatalogDetailShape & { catalog_id?: number }) | null>(null);
  const [detailStock, setDetailStock] = useState<EquipmentStockRow | null>(null);
  const [detailHoldings, setDetailHoldings] = useState<CatalogTeacherHolding[]>([]);
  const [detailHoldingsLoading, setDetailHoldingsLoading] = useState(false);
  const [catalogEdit, setCatalogEdit] = useState<{ id: number | null; form: CatalogFormState | null } | null>(null);
  const [rentTarget, setRentTarget] = useState<EquipmentStockRow | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<{ row: EquipmentStockRow; kind: 'on_hand' | 'quarantine' } | null>(
    null,
  );
  const [returnTarget, setReturnTarget] = useState<CatalogHoldingGroup | null>(null);
  const [stockQuery, setStockQuery] = useState('');
  const [connectionState, setConnectionState] = useState<EquipmentInventoryConnectionState>('LOAD_ERROR');

  const ledgerReady = connectionState === 'LEDGER_READY';
  /** Legacy catalog (images, names) still visible while ledger DB is missing. */
  const showCatalogStockList = connectionState === 'SCHEMA_MISSING' || connectionState === 'LEDGER_READY';
  const catalogPreviewOnly = connectionState === 'SCHEMA_MISSING';

  const refreshStock = useCallback(async () => {
    const res = await fetch('/api/admin/equipment/stock', { cache: 'no-store' });
    if (!res.ok) throw new Error('stock fetch failed');
    const body = (await res.json()) as {
      items: EquipmentStockRow[];
      data_source?: 'legacy' | 'ledger';
      capabilities?: EquipmentCapabilities;
      connection_state?: EquipmentInventoryConnectionState;
    };
    const caps = body.capabilities ?? defaultCapabilities;
    const ds = body.data_source === 'ledger' ? 'ledger' : 'legacy';
    setStock(body.items ?? []);
    setCapabilities(caps);
    setConnectionState(
      body.connection_state ??
        resolveInventoryConnectionState({ capabilities: caps, dataSource: ds, loadFailed: false }),
    );
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
      .catch(() => {
        setConnectionState('LOAD_ERROR');
        toast.error('교구 데이터를 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }, [refreshStock, refreshTeachers]);

  useEffect(() => {
    if (tab === 'history') {
      void refreshHistory().catch(() => toast.error('이력을 불러오지 못했습니다.'));
    }
  }, [tab, refreshHistory]);

  useEffect(() => {
    if (tab === 'teachers' && selectedTeacherId && (ledgerReady || catalogPreviewOnly)) {
      const controller = new AbortController();
      void refreshRentals(selectedTeacherId, controller.signal).catch(() => {
        if (!controller.signal.aborted) toast.error('보유 내역을 불러오지 못했습니다.');
      });
      return () => controller.abort();
    }
  }, [tab, selectedTeacherId, refreshRentals, ledgerReady, catalogPreviewOnly]);

  useEffect(() => {
    if (!detailItem?.catalog_id || !ledgerReady) {
      setDetailHoldings([]);
      setDetailHoldingsLoading(false);
      return;
    }
    const controller = new AbortController();
    setDetailHoldingsLoading(true);
    void fetch(
      `/api/admin/equipment/rentals?catalog_id=${detailItem.catalog_id}&active=true`,
      { cache: 'no-store', signal: controller.signal },
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('rentals'))))
      .then((body: { items: EquipmentRentalRow[] }) => {
        const byTeacher = new Map<string, CatalogTeacherHolding>();
        for (const r of body.items ?? []) {
          const name = r.teacher_name ?? r.teacher_id;
          const cur = byTeacher.get(r.teacher_id) ?? { teacher_name: name, qty_outstanding: 0 };
          cur.qty_outstanding += r.qty_outstanding;
          byTeacher.set(r.teacher_id, cur);
        }
        setDetailHoldings([...byTeacher.values()].sort((a, b) => a.teacher_name.localeCompare(b.teacher_name)));
      })
      .catch(() => {
        if (!controller.signal.aborted) setDetailHoldings([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailHoldingsLoading(false);
      });
    return () => controller.abort();
  }, [detailItem?.catalog_id, ledgerReady]);

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

  const legacyTeacherHoldings = useMemo(() => {
    return [...legacyInventory]
      .filter((row) => (Number(row.quantity) || 0) > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [legacyInventory]);

  const catalogHoldings = useMemo((): CatalogHoldingGroup[] => {
    const map = new Map<number, CatalogHoldingGroup>();
    for (const r of rentals) {
      const cur = map.get(r.catalog_id) ?? {
        catalog_id: r.catalog_id,
        catalog_name: r.catalog_name ?? '—',
        qty_outstanding: 0,
        rentals: [],
      };
      cur.qty_outstanding += r.qty_outstanding;
      cur.rentals.push(r);
      map.set(r.catalog_id, cur);
    }
    return [...map.values()].sort((a, b) => a.catalog_name.localeCompare(b.catalog_name, 'ko'));
  }, [rentals]);

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

  const afterMutation = async () => {
    await refreshStock();
    if (selectedTeacherId) await refreshRentals(selectedTeacherId);
    if (tab === 'history') await refreshHistory();
  };

  const openDetail = (row: EquipmentStockRow) => {
    setDetailStock(row);
    setDetailItem({
      catalog_id: row.catalog_id,
      name: row.name,
      category: row.category,
      mgmt_code: row.mgmt_code,
      image: row.image,
      simple_desc: row.simple_desc,
      key_points: row.key_points,
      usage_examples: row.usage_examples,
    });
  };

  const openEdit = (row: EquipmentStockRow) => {
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <p className="text-sm font-bold text-slate-400">교구 수불 데이터 불러오는 중…</p>
      </div>
    );
  }

  const detailStockView =
    detailStock && ledgerReady
      ? {
          qty_on_hand_total: detailStock.qty_on_hand_total,
          qty_warehouse: detailStock.qty_warehouse,
          qty_lent: detailStock.qty_lent,
          qty_quarantine: detailStock.qty_quarantine,
          qty_available: detailStock.qty_available,
          showQty: canShowStockQty(detailStock, capabilities.ledger_writes),
          statusLabel: stockStatusLabel(getStockDisplayStatus(detailStock, capabilities.ledger_writes)),
        }
      : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-4 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Package className="text-indigo-600" size={22} />
              <h1 className="text-lg font-black text-slate-900">교구 수불관리</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">교구별 창고 재고와 강사 대여 현황을 관리합니다.</p>
          </div>
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

      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-4">
        {connectionState === 'SCHEMA_MISSING' && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950 space-y-1">
            <p>{SCHEMA_MISSING_USER_MESSAGE}</p>
            <p className="text-xs text-amber-900/80">기존 교구 목록·이미지와 강사 보유·이력은 아래에서 조회할 수 있습니다. (읽기 전용)</p>
          </div>
        )}
        {connectionState === 'MODE_MISMATCH' && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950 space-y-2">
            <p className="font-black">UI와 서버 수불 모드가 일치하지 않습니다.</p>
            <p className="text-xs">
              신규 UI는 <code className="bg-white/80 px-1 rounded">NEXT_PUBLIC_EQUIPMENT_UI=ledger</code> 빌드이며, 서버{' '}
              <code className="bg-white/80 px-1 rounded">EQUIPMENT_WRITE_MODE=ledger</code>와 함께 동작해야 합니다.
            </p>
          </div>
        )}
        {connectionState === 'LOAD_ERROR' && (
          <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-950">
            <p className="font-black">교구 데이터를 불러오지 못했습니다.</p>
            <p className="text-xs mt-1">권한·네트워크·일시적 서버 오류를 확인한 뒤 다시 시도하세요.</p>
          </div>
        )}

        {ledgerReady && stock.some((r) => !r.opening_confirmed) && tab === 'stock' && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            기초재고(OPENING)가 확정되지 않은 품목은 가용 수량을 표시하지 않으며 대여할 수 없습니다.
          </p>
        )}
        {ledgerReady && stock.some((r) => r.cache_drift) && tab === 'stock' && (
          <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            재고 캐시 불일치가 탐지된 품목이 있습니다. 수불 쓰기가 차단됩니다. (자동 보정 없음)
          </p>
        )}

        {tab === 'stock' && (
          <div className="space-y-4">
            {!showCatalogStockList ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-400 text-sm">
                재고 목록은 수불 원장 연결이 완료된 후 표시됩니다.
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                  <input
                    type="search"
                    placeholder="교구명·관리번호·카테고리 검색"
                    value={stockQuery}
                    onChange={(e) => setStockQuery(e.target.value)}
                    className="flex-1 min-w-0 p-3 rounded-xl border border-slate-200 bg-white text-sm"
                  />
                  {ledgerReady && (
                    <button
                      type="button"
                      onClick={() => setCatalogEdit({ id: null, form: null })}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold shrink-0"
                    >
                      <Plus size={16} /> 교구 등록
                    </button>
                  )}
                </div>
                <EquipmentStockTable
                  rows={filteredStock}
                  ledgerWrites={ledgerReady && capabilities.ledger_writes}
                  onDetail={openDetail}
                  onEdit={openEdit}
                  onRent={setRentTarget}
                  onAdjust={(row) => setAdjustTarget({ row, kind: 'on_hand' })}
                  onQuarantine={(row) => setAdjustTarget({ row, kind: 'quarantine' })}
                />
                <EquipmentStockCards
                  rows={filteredStock}
                  ledgerWrites={ledgerReady && capabilities.ledger_writes}
                  onDetail={openDetail}
                  onEdit={openEdit}
                  onRent={setRentTarget}
                  onAdjust={(row) => setAdjustTarget({ row, kind: 'on_hand' })}
                  onQuarantine={(row) => setAdjustTarget({ row, kind: 'quarantine' })}
                />
              </>
            )}
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
                </button>
              ))}
            </div>
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 min-h-[240px]">
              {connectionState === 'LOAD_ERROR' || connectionState === 'MODE_MISMATCH' ? (
                <p className="text-slate-400 text-sm">
                  {connectionState === 'LOAD_ERROR'
                    ? '강사 보유 데이터를 불러올 수 없습니다.'
                    : '강사별 보유는 수불 원장 연결이 완료된 후 표시됩니다.'}
                </p>
              ) : !selectedTeacherId ? (
                <p className="text-slate-400 text-sm">강사를 선택하세요.</p>
              ) : catalogPreviewOnly ? (
                <div className="space-y-3">
                  <h3 className="font-black text-slate-800">보유 교구 (기존 데이터)</h3>
                  {legacyTeacherHoldings.length === 0 ? (
                    <p className="text-sm text-slate-400">보유 교구가 없습니다.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {legacyTeacherHoldings.map((row) => (
                        <li key={row.id} className="py-3 flex justify-between gap-2 text-sm">
                          <span className="font-bold text-slate-800">{row.name}</span>
                          <span className="tabular-nums text-slate-600">{row.quantity}개</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-black text-slate-800">보유 교구</h3>
                  {catalogHoldings.length === 0 ? (
                    <p className="text-sm text-slate-400">미반납 교구가 없습니다.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-slate-500 border-b">
                            <th className="py-2 pr-4">교구</th>
                            <th className="py-2 pr-4 text-right">미반납</th>
                            <th className="py-2">작업</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catalogHoldings.map((group) => (
                            <tr key={group.catalog_id} className="border-b border-slate-50">
                              <td className="py-3 pr-4 font-bold">{group.catalog_name}</td>
                              <td className="py-3 pr-4 text-right tabular-nums">{group.qty_outstanding}개</td>
                              <td className="py-3">
                                {ledgerReady && group.qty_outstanding > 0 && (
                                  <button
                                    type="button"
                                    className="text-xs font-bold text-indigo-600"
                                    onClick={() => setReturnTarget(group)}
                                  >
                                    반납
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
              <span className="text-xs font-black text-slate-500">
                {!ledgerReady ? '대여·반납 이력' : '수불 원장 이력'}
              </span>
            </div>
            {!ledgerReady ? (
              catalogPreviewOnly ? (
                <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
                  {legacyHistory.length === 0 ? (
                    <li className="p-6 text-sm text-slate-400">이력이 없습니다.</li>
                  ) : (
                    legacyHistory.map((item) => (
                      <li key={item.id} className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap justify-between gap-2">
                          <span className="font-bold text-slate-800">
                            {teachers.find((teacher) => teacher.id === item.user_id)?.name ?? '—'}
                          </span>
                          <time className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString('ko-KR')}</time>
                        </div>
                        <p className="text-slate-600 whitespace-pre-line">{item.content}</p>
                      </li>
                    ))
                  )}
                </ul>
              ) : (
                <p className="p-6 text-sm text-slate-400">이력은 수불 원장 연결이 완료된 후 표시됩니다.</p>
              )
            ) : (
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 sticky top-0">
                    <tr>
                      <th className="p-3 text-left">일시</th>
                      <th className="p-3 text-left">작업</th>
                      <th className="p-3 text-left">교구</th>
                      <th className="p-3 text-left">강사</th>
                      <th className="p-3 text-right">수량</th>
                      <th className="p-3 text-left">처리 담당자</th>
                      <th className="p-3 text-left">사유</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          이력이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      history.map((h) => (
                        <tr key={h.ledger_id} className="border-t border-slate-100">
                          <td className="p-3 whitespace-nowrap text-xs text-slate-500">
                            {new Date(h.occurred_at).toLocaleString('ko-KR')}
                          </td>
                          <td className="p-3 font-semibold">{equipmentEventTypeLabel(h.event_type)}</td>
                          <td className="p-3">{h.catalog_name ?? h.catalog_id}</td>
                          <td className="p-3">{h.teacher_name ?? '—'}</td>
                          <td className="p-3 text-right tabular-nums">{h.qty}</td>
                          <td className="p-3">{h.created_by_name ?? (h.created_by ? h.created_by.slice(0, 8) : '—')}</td>
                          <td className="p-3 text-slate-500 max-w-[200px] truncate">{h.note ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {detailItem && (
        <CatalogDetailModal
          item={detailItem}
          stock={detailStockView}
          teacherHoldings={ledgerReady ? detailHoldings : undefined}
          holdingsLoading={detailHoldingsLoading}
          onClose={() => {
            setDetailItem(null);
            setDetailStock(null);
          }}
        />
      )}

      {catalogEdit && ledgerReady && (
        <CatalogEditorModal
          editingId={catalogEdit.id}
          initial={catalogEdit.form}
          supportsManagementCode
          onClose={() => setCatalogEdit(null)}
          onSaved={() => void refreshStock()}
        />
      )}

      {rentTarget && ledgerReady && (
        <RentEquipmentModal
          target={rentTarget}
          teacherOptions={teacherOptions}
          onClose={() => setRentTarget(null)}
          onConfirm={async (teacherId, qty) => {
            try {
              await postJson('/api/admin/equipment/rent', {
                catalog_id: rentTarget.catalog_id,
                teacher_id: teacherId,
                qty,
                request_key: crypto.randomUUID(),
              });
              toast.success('대여가 등록되었습니다.');
              setRentTarget(null);
              await afterMutation();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : '대여 실패');
            }
          }}
        />
      )}

      {adjustTarget && ledgerReady && (
        <AdjustStockModal
          target={adjustTarget.row}
          kind={adjustTarget.kind}
          onClose={() => setAdjustTarget(null)}
          onConfirm={async (delta, note) => {
            try {
              await postJson('/api/admin/equipment/adjust', {
                catalog_id: adjustTarget.row.catalog_id,
                delta,
                kind: adjustTarget.kind,
                note,
                request_key: crypto.randomUUID(),
              });
              toast.success('재고가 조정되었습니다.');
              setAdjustTarget(null);
              await afterMutation();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : '조정 실패');
            }
          }}
        />
      )}

      {returnTarget && ledgerReady && (
        <ReturnEquipmentModal
          catalogName={returnTarget.catalog_name}
          rentals={returnTarget.rentals.filter((r) => r.qty_outstanding > 0)}
          onClose={() => setReturnTarget(null)}
          onConfirm={async (rentalId, qty) => {
            try {
              await postJson('/api/admin/equipment/return', {
                rental_id: rentalId,
                qty,
                request_key: crypto.randomUUID(),
              });
              toast.success('반납이 확인되었습니다.');
              setReturnTarget(null);
              await afterMutation();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : '반납 실패');
            }
          }}
        />
      )}
    </div>
  );
}
