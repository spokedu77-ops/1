'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Package, Plus } from 'lucide-react';
import type { EquipmentCapabilities } from '@/app/lib/equipment/capabilities';
import {
  resolveInventoryConnectionState,
  SCHEMA_MISSING_USER_MESSAGE,
  type EquipmentInventoryConnectionState,
} from '@/app/lib/equipment/inventoryConnectionState';
import { equipmentEventTypeLabel } from '@/app/lib/equipment/ledgerLabels';
import type { EquipmentLedgerRow, EquipmentRentalRow, EquipmentStockRow } from '@/app/lib/equipment/types';
import {
  CatalogDetailModal,
  type CatalogDetailShape,
  type CatalogTeacherHolding,
} from './equipmentUiShared';
import { CatalogEditorModal, type CatalogFormState } from './CatalogEditorModal';
import {
  AdjustStockModal,
  RentEquipmentModal,
  ReturnEquipmentModal,
  StockInputModal,
  TeacherHoldingsModal,
  type TeacherHoldingGroup,
} from './equipmentModals';
import styles from './equipmentInventory.module.css';
import { EquipmentApiError, postEquipmentJson } from '@/app/lib/equipment/postEquipmentJson';
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
  inventory_item_count?: number;
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
  opening_persist_enabled: false,
};

export function EquipmentInventoryApp() {
  const [tab, setTab] = useState<TabId>('stock');
  const [capabilities, setCapabilities] = useState<EquipmentCapabilities>(defaultCapabilities);
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
  const [rentModalOpen, setRentModalOpen] = useState(false);
  const [rentPreset, setRentPreset] = useState<EquipmentStockRow | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<EquipmentStockRow | null>(null);
  const [returnTarget, setReturnTarget] = useState<CatalogHoldingGroup | null>(null);
  const [stockQuery, setStockQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'RENT' | 'RETURN'>('all');
  const [teacherDetailOpen, setTeacherDetailOpen] = useState(false);
  const [stockInputTarget, setStockInputTarget] = useState<EquipmentStockRow | null>(null);
  const [connectionState, setConnectionState] = useState<EquipmentInventoryConnectionState>('LOAD_ERROR');

  const ledgerReady = connectionState === 'LEDGER_READY';
  /** Legacy catalog (images, names) still visible while ledger DB is missing. */
  const catalogPreviewOnly = connectionState === 'SCHEMA_MISSING' || connectionState === 'LEGACY_READY';
  const showCatalogStockList = catalogPreviewOnly || ledgerReady;

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
    const body = (await res.json()) as { items: EquipmentLedgerRow[] };
    setHistory(body.items ?? []);
  }, [selectedTeacherId]);

  const refreshRentals = useCallback(async (teacherId: string, signal?: AbortSignal) => {
    setRentals([]);
    const res = await fetch(
      `/api/admin/equipment/rentals?teacher_id=${encodeURIComponent(teacherId)}&active=true`,
      { cache: 'no-store', signal },
    );
    if (!res.ok) throw new Error('rentals fetch failed');
    const body = (await res.json()) as { items: EquipmentRentalRow[] };
    if (signal?.aborted) return;
    setRentals(body.items ?? []);
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
    if (tab === 'teachers' && selectedTeacherId && ledgerReady) {
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
        (row.category ?? '').toLowerCase().includes(q),
    );
  }, [stock, stockQuery]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return history;
    if (historyFilter === 'RETURN') {
      return history.filter((h) => h.event_type === 'RETURN_CONFIRM');
    }
    return history.filter((h) => h.event_type === historyFilter);
  }, [history, historyFilter]);

  const openTeacherDetail = (teacherId: string) => {
    if (!ledgerReady) {
      toast.message('수불 원장 연결 후 강사별 대여 현황을 볼 수 있습니다.');
      return;
    }
    setSelectedTeacherId(teacherId);
    setTeacherDetailOpen(true);
  };

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

  const openingPersistEnabled = capabilities.opening_persist_enabled !== false;

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

  const openRent = (row?: EquipmentStockRow) => {
    setRentPreset(row ?? null);
    setRentModalOpen(true);
  };

  const rentCatalogOptions = useMemo(
    () =>
      stock
        .filter((r) => r.opening_confirmed && canShowStockQty(r, capabilities.ledger_writes))
        .map((r) => ({ catalog_id: r.catalog_id, name: r.name, qty_available: r.qty_available })),
    [stock, capabilities.ledger_writes],
  );

  if (loading) {
    return (
      <div className={styles.shell}>
        <div className={styles.loadingCenter}>교구 수불 데이터 불러오는 중…</div>
      </div>
    );
  }

  const detailStockView =
    detailStock && ledgerReady
      ? {
          qty_on_hand_total: detailStock.qty_on_hand_total,
          qty_warehouse: detailStock.qty_warehouse,
          qty_lent: detailStock.qty_lent,
          qty_available: detailStock.qty_available,
          showQty: canShowStockQty(detailStock, capabilities.ledger_writes),
          statusLabel: stockStatusLabel(getStockDisplayStatus(detailStock, capabilities.ledger_writes)),
        }
      : null;

  const tabItems: { id: TabId; label: string }[] = [
    { id: 'stock', label: '교구 재고(창고)' },
    { id: 'teachers', label: '강사 목록' },
    { id: 'history', label: '대여/반납 이력' },
  ];

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  return (
    <div className={styles.shell}>
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>
              <Package size={20} style={{ color: 'var(--eq-primary)' }} />
              교구 수불관리
            </h1>
            <p className={styles.pageSubtitle}>창고 재고 수불 및 강사별 대여/반납 현황을 관리합니다.</p>
          </div>
          {ledgerReady ? (
            <div className={styles.headerActions}>
              <button type="button" className={styles.btnGhost} onClick={() => openRent()}>
                <Plus size={16} /> 수동 대여 등록
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setCatalogEdit({ id: null, form: null })}
              >
                <Plus size={16} /> 교구 등록
              </button>
            </div>
          ) : null}
        </header>

        <div className={styles.mainArea}>
          <div className={styles.tabs} role="tablist">
            {tabItems.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`${styles.tabBtn} ${tab === id ? styles.tabBtnActive : ''}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.tabPanel}>
            {connectionState === 'LOAD_ERROR' && (
              <div className={styles.alertError}>
                <p className="font-bold">교구 데이터를 불러오지 못했습니다.</p>
                <p className="text-xs mt-1">권한·네트워크·일시적 서버 오류를 확인한 뒤 다시 시도하세요.</p>
              </div>
            )}

            {ledgerReady && stock.some((r) => r.cache_drift) && tab === 'stock' && (
              <div className={styles.alertError}>
                재고 캐시 불일치가 탐지된 품목이 있습니다. 수불 쓰기가 차단됩니다. (자동 보정 없음)
              </div>
            )}

            {tab === 'stock' && (
              <>
                {!showCatalogStockList ? (
                  <div className={`${styles.panel} ${styles.emptyState}`}>
                    재고 목록은 수불 원장 연결이 완료된 후 표시됩니다.
                  </div>
                ) : (
                  <>
                    <div className={styles.toolbar}>
                      <div className={styles.toolbarLeft}>
                        <input
                          type="search"
                          placeholder="교구명·카테고리 검색"
                          value={stockQuery}
                          onChange={(e) => setStockQuery(e.target.value)}
                          className={styles.input}
                        />
                      </div>
                    </div>
                <EquipmentStockTable
                  rows={filteredStock}
                  ledgerWrites={ledgerReady && capabilities.ledger_writes}
                  openingPersistEnabled={openingPersistEnabled}
                  onDetail={openDetail}
                  onRent={(row) => openRent(row)}
                  onAdjust={(row) => setAdjustTarget(row)}
                  onStockInput={setStockInputTarget}
                />
                <EquipmentStockCards
                  rows={filteredStock}
                  ledgerWrites={ledgerReady && capabilities.ledger_writes}
                  openingPersistEnabled={openingPersistEnabled}
                  onDetail={openDetail}
                  onRent={(row) => openRent(row)}
                  onAdjust={(row) => setAdjustTarget(row)}
                  onStockInput={setStockInputTarget}
                />
                  </>
                )}
              </>
            )}

            {tab === 'teachers' && (
              <>
                {connectionState === 'LOAD_ERROR' || connectionState === 'MODE_MISMATCH' ? (
                  <p className={styles.emptyState}>
                    {connectionState === 'LOAD_ERROR'
                      ? '강사 보유 데이터를 불러올 수 없습니다.'
                      : '강사별 보유는 수불 원장 연결이 완료된 후 표시됩니다.'}
                  </p>
                ) : teachers.length === 0 ? (
                  <p className={styles.emptyState}>등록된 강사가 없습니다.</p>
                ) : (
                  <div className={styles.teacherGrid}>
                    {teachers.map((t) => {
                      const skuCount = t.ledger_sku_count ?? t.inventory_item_count ?? 0;
                      const initial = t.name.trim().charAt(0) || '?';
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={styles.teacherCard}
                          onClick={() => openTeacherDetail(t.id)}
                        >
                          <div className={styles.teacherHeader}>
                            <div className={styles.teacherAvatar}>{initial}</div>
                            <div className={styles.teacherInfo}>
                              <h3>{t.name} 선생님</h3>
                              <p>현재 대여 중: {skuCount}종</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {tab === 'history' && (
              <>
                {ledgerReady && (
                  <div className={styles.toolbar}>
                    <div className={styles.toolbarLeft}>
                      <select
                        className={styles.select}
                        value={historyFilter}
                        onChange={(e) => setHistoryFilter(e.target.value as typeof historyFilter)}
                      >
                        <option value="all">전체 이력</option>
                        <option value="RENT">대여</option>
                        <option value="RETURN">반납</option>
                      </select>
                    </div>
                  </div>
                )}
                <div className={styles.tableWrap}>
                  {!ledgerReady ? (
                    <p className={styles.emptyState}>
                      {connectionState === 'SCHEMA_MISSING'
                        ? SCHEMA_MISSING_USER_MESSAGE
                        : '이력은 수불 원장 연결이 완료된 후 표시됩니다.'}
                    </p>
                  ) : (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th className={styles.textLeft}>일시</th>
                          <th>작업</th>
                          <th className={styles.textLeft}>교구</th>
                          <th>강사</th>
                          <th className={styles.textRight}>수량</th>
                          <th className={styles.textLeft}>처리 담당자</th>
                          <th className={styles.textLeft}>사유</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.length === 0 ? (
                          <tr>
                            <td colSpan={7} className={styles.emptyState}>
                              <p>아직 대여·반납 이력이 없습니다.</p>
                              <p className="text-xs mt-1">필터 조건에 맞는 이력이 없거나 아직 기록이 없습니다.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredHistory.map((h) => (
                            <tr key={h.ledger_id}>
                              <td className={`${styles.textLeft} whitespace-nowrap text-xs text-gray-500`}>
                                {new Date(h.occurred_at).toLocaleString('ko-KR')}
                              </td>
                              <td>{equipmentEventTypeLabel(h.event_type)}</td>
                              <td className={styles.textLeft}>{h.catalog_name ?? h.catalog_id}</td>
                              <td>{h.teacher_name ?? '—'}</td>
                              <td className={styles.textRight}>{h.qty}</td>
                              <td className={styles.textLeft}>
                                {h.created_by_name ?? (h.created_by ? h.created_by.slice(0, 8) : '—')}
                              </td>
                              <td className={`${styles.textLeft} max-w-[200px] truncate text-gray-500`}>
                                {h.note ?? '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {teacherDetailOpen && selectedTeacher && ledgerReady && (
        <TeacherHoldingsModal
          teacherName={selectedTeacher.name}
          holdings={catalogHoldings}
          ledgerReady={ledgerReady}
          onClose={() => setTeacherDetailOpen(false)}
          onPartialReturn={(group) => {
            setReturnTarget(group);
            setTeacherDetailOpen(false);
          }}
          onBulkReturnFull={async (groups: TeacherHoldingGroup[]) => {
            try {
              let lineCount = 0;
              for (const group of groups) {
                for (const rental of group.rentals.filter((r) => r.qty_outstanding > 0)) {
                  await postEquipmentJson('/api/admin/equipment/return', {
                    rental_id: rental.rental_id,
                    qty: rental.qty_outstanding,
                    note: '선택 일괄 반납',
                    request_key: crypto.randomUUID(),
                  });
                  lineCount += 1;
                }
              }
              toast.success(`${groups.length}종 · ${lineCount}건 전량 반납했습니다.`);
              setTeacherDetailOpen(false);
              await afterMutation();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : '일괄 반납 실패');
              throw e;
            }
          }}
        />
      )}

      {stockInputTarget && ledgerReady && (
        <StockInputModal
          target={stockInputTarget}
          onClose={() => setStockInputTarget(null)}
          onConfirm={async ({ qtyOnHandTotal }) => {
            try {
              await postEquipmentJson('/api/admin/equipment/opening', {
                catalog_id: stockInputTarget.catalog_id,
                qty_on_hand_total: qtyOnHandTotal,
                qty_quarantine: 0,
                note: '재고 입력 확정',
                request_key: crypto.randomUUID(),
              });
              setStockInputTarget(null);
              toast.success('재고가 확정되었습니다.');
              await afterMutation();
              await refreshTeachers();
            } catch (error) {
              if (error instanceof EquipmentApiError && error.code === 'OPENING_ALREADY_CONFIRMED') {
                toast.error(error.message);
                setStockInputTarget(null);
                await refreshStock();
                return;
              }
              toast.error(error instanceof Error ? error.message : '재고 확정 실패');
            }
          }}
        />
      )}

      {detailItem && (
        <CatalogDetailModal
          item={detailItem}
          stock={detailStockView}
          teacherHoldings={ledgerReady ? detailHoldings : undefined}
          holdingsLoading={detailHoldingsLoading}
          onEdit={
            ledgerReady && detailStock
              ? () => {
                  openEdit(detailStock);
                  setDetailItem(null);
                  setDetailStock(null);
                }
              : undefined
          }
          onAdjustStock={
            ledgerReady && detailStock && canShowStockQty(detailStock, capabilities.ledger_writes)
              ? () => {
                  setAdjustTarget(detailStock);
                  setDetailItem(null);
                  setDetailStock(null);
                }
              : undefined
          }
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
          supportsManagementCode={false}
          onClose={() => setCatalogEdit(null)}
          onSaved={() => void refreshStock()}
        />
      )}

      {rentModalOpen && ledgerReady && (
        <RentEquipmentModal
          preset={rentPreset}
          catalogOptions={rentCatalogOptions}
          teacherOptions={teacherOptions}
          onClose={() => {
            setRentModalOpen(false);
            setRentPreset(null);
          }}
          onConfirm={async (catalogId, teacherId, qty) => {
            try {
              await postEquipmentJson('/api/admin/equipment/rent', {
                catalog_id: catalogId,
                teacher_id: teacherId,
                qty,
                request_key: crypto.randomUUID(),
              });
              toast.success('대여가 등록되었습니다.');
              setRentModalOpen(false);
              setRentPreset(null);
              await afterMutation();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : '대여 실패');
            }
          }}
        />
      )}

      {adjustTarget && ledgerReady && (
        <AdjustStockModal
          target={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onConfirm={async (delta, note) => {
            try {
              await postEquipmentJson('/api/admin/equipment/adjust', {
                catalog_id: adjustTarget.catalog_id,
                delta,
                kind: 'on_hand',
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
              await postEquipmentJson('/api/admin/equipment/return', {
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
