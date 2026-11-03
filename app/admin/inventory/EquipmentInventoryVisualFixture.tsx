'use client';

import { useMemo, useState } from 'react';
import { History, Package, Plus, UserCircle2 } from 'lucide-react';
import type { EquipmentLedgerRow, EquipmentRentalRow, EquipmentStockRow } from '@/app/lib/equipment/types';
import { equipmentEventTypeLabel } from '@/app/lib/equipment/ledgerLabels';
import { AdjustStockModal, RentEquipmentModal, ReturnEquipmentModal, StockInputModal } from './equipmentModals';
import { EquipmentStockCards, EquipmentStockTable } from './equipmentStockUi';
import styles from './equipmentInventory.module.css';

export type VisualFixtureScenario = 'normal' | 'opening' | 'drift' | 'empty' | 'mismatch' | 'modals';

const FIXTURE_IMAGE = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="#e0e7ff" width="80" height="80"/><text x="40" y="45" text-anchor="middle" fill="#4338ca" font-size="12">QA</text></svg>',
);

function baseRow(partial: Partial<EquipmentStockRow> & Pick<EquipmentStockRow, 'catalog_id' | 'name'>): EquipmentStockRow {
  return {
    category: 'Fixture',
    mgmt_code: 'FX-001',
    image: FIXTURE_IMAGE,
    simple_desc: '시각 QA 가상 교구',
    key_points: '핵심 포인트(가상)',
    usage_examples: '활용 예시(가상)',
    qty_on_hand_total: 10,
    qty_warehouse: 6,
    qty_lent: 2,
    qty_quarantine: 1,
    qty_available: 3,
    opening_confirmed: true,
    cache_drift: false,
    ...partial,
  };
}

function rowsForScenario(scenario: VisualFixtureScenario): EquipmentStockRow[] {
  if (scenario === 'empty') return [];
  if (scenario === 'mismatch') return [];
  if (scenario === 'opening') {
    return [
      baseRow({
        catalog_id: 9001,
        name: 'Fixture-미확정',
        opening_confirmed: false,
        qty_available: 0,
        legacy_qty_held: 3,
        legacy_mapping_pending: false,
      }),
      baseRow({ catalog_id: 9002, name: 'Fixture-정상', opening_confirmed: true }),
    ];
  }
  if (scenario === 'drift') {
    return [baseRow({ catalog_id: 9003, name: 'Fixture-캐시불일치', cache_drift: true })];
  }
  return [
    baseRow({ catalog_id: 9004, name: 'Fixture-농구공', mgmt_code: 'BB-01' }),
    baseRow({ catalog_id: 9005, name: 'Fixture-콘', category: '이동', mgmt_code: 'CN-10', qty_available: 8 }),
  ];
}

const mockRentTarget = baseRow({ catalog_id: 9004, name: 'Fixture-농구공' });
const mockReturnRentals: EquipmentRentalRow[] = [
  {
    rental_id: '11111111-1111-1111-1111-111111111111',
    catalog_id: 9004,
    teacher_id: '22222222-2222-2222-2222-222222222222',
    catalog_name: 'Fixture-농구공',
    teacher_name: 'FixtureTeacher',
    qty_lent: 4,
    qty_returned: 0,
    qty_outstanding: 4,
    status: 'active',
    opened_at: new Date().toISOString(),
    closed_at: null,
  },
  {
    rental_id: '33333333-3333-3333-3333-333333333333',
    catalog_id: 9004,
    teacher_id: '22222222-2222-2222-2222-222222222222',
    catalog_name: 'Fixture-농구공',
    teacher_name: 'FixtureTeacher',
    qty_lent: 2,
    qty_returned: 0,
    qty_outstanding: 2,
    status: 'active',
    opened_at: new Date(Date.now() - 86400000).toISOString(),
    closed_at: null,
  },
];

const mockHistory: EquipmentLedgerRow[] = [
  {
    ledger_id: 'aaaa',
    event_type: 'RENT',
    catalog_id: 9004,
    catalog_name: 'Fixture-농구공',
    teacher_id: 't1',
    teacher_name: 'FixtureTeacher',
    rental_id: mockReturnRentals[0].rental_id,
    qty: 2,
    note: '가상 대여',
    occurred_at: new Date().toISOString(),
    metadata: {},
    created_by: 'admin-fixture',
    created_by_name: 'FixtureAdmin',
  },
];

export function EquipmentInventoryVisualFixture({ scenario }: { scenario: VisualFixtureScenario }) {
  const [showRent, setShowRent] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showStockInput, setShowStockInput] = useState(false);

  const rows = useMemo(() => rowsForScenario(scenario), [scenario]);
  const ledgerWrites = scenario !== 'mismatch';

  return (
    <div className={styles.shell} data-fixture-scenario={scenario}>
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>
              <Package size={20} style={{ color: 'var(--eq-primary)' }} />
              교구 수불관리
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-2">Fixture</span>
            </h1>
            <p className={styles.pageSubtitle}>창고 재고 수불 및 강사별 대여/반납 현황을 관리합니다.</p>
          </div>
        </header>
        <div className={styles.tabs}>
          {['교구 재고(창고)', '강사 목록', '대여/반납 이력'].map((label) => (
            <span
              key={label}
              className={`${styles.tabBtn} ${label === '교구 재고(창고)' ? styles.tabBtnActive : ''}`}
            >
              {label}
            </span>
          ))}
        </div>
        <div className={styles.tabPanel}>
        {scenario === 'mismatch' && (
          <div
            className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950"
            data-fixture="mismatch-banner"
          >
            <p className="font-black">UI와 서버 수불 모드가 일치하지 않습니다.</p>
            <p className="text-xs mt-2">수불 원장 데이터를 불러올 수 없습니다. (fixture)</p>
          </div>
        )}

        {scenario === 'opening' && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            기초재고(OPENING)가 확정되지 않은 품목은 가용 수량을 표시하지 않으며 대여할 수 없습니다.
          </p>
        )}
        {scenario === 'drift' && (
          <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            재고 캐시 불일치가 탐지된 품목이 있습니다. 수불 쓰기가 차단됩니다.
          </p>
        )}

        {scenario !== 'mismatch' && (
          <>
            <div className={styles.toolbar}>
              <input
                type="search"
                placeholder="교구명·카테고리 검색"
                defaultValue="Fixture"
                className={styles.input}
                readOnly
              />
              <button type="button" className={styles.btnPrimary}>
                <Plus size={16} /> 교구 등록
              </button>
            </div>
            <EquipmentStockTable
              rows={rows}
              ledgerWrites={ledgerWrites}
              openingPersistEnabled
              onDetail={() => {}}
              onRent={() => setShowRent(true)}
              onAdjust={() => setShowAdjust(true)}
              onStockInput={() => setShowStockInput(true)}
            />
            <EquipmentStockCards
              rows={rows}
              ledgerWrites={ledgerWrites}
              openingPersistEnabled
              onDetail={() => {}}
              onRent={() => setShowRent(true)}
              onAdjust={() => setShowAdjust(true)}
              onStockInput={() => setShowStockInput(true)}
            />
          </>
        )}

        {scenario === 'modals' && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="px-3 py-2 rounded-lg border text-sm font-bold" onClick={() => setShowRent(true)}>
              대여 모달
            </button>
            <button type="button" className="px-3 py-2 rounded-lg border text-sm font-bold" onClick={() => setShowAdjust(true)}>
              재고 조정
            </button>
            <button type="button" className="px-3 py-2 rounded-lg border text-sm font-bold" onClick={() => setShowReturn(true)}>
              반납
            </button>
            <button type="button" className="px-3 py-2 rounded-lg border text-sm font-bold" onClick={() => setShowStockInput(true)}>
              재고 입력
            </button>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4" data-fixture="teachers-preview">
          <div className="flex items-center gap-2 mb-3">
            <UserCircle2 size={18} className="text-indigo-600" />
            <h3 className="font-black">강사 목록 (fixture)</h3>
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b">
                <th className="py-2">교구</th>
                <th className="py-2 text-right">미반납</th>
                <th className="py-2">작업</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 font-bold">Fixture-농구공</td>
                <td className="py-2 text-right tabular-nums">6개</td>
                <td className="py-2 text-indigo-600 font-bold text-xs">반납</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden" data-fixture="history-table">
          <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
            <History size={16} className="text-slate-400" />
            <span className="text-xs font-black text-slate-500">수불 원장 이력 (fixture)</span>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="p-3 text-left">일시</th>
                <th className="p-3 text-left">작업</th>
                <th className="p-3 text-left">교구</th>
                <th className="p-3 text-left">강사</th>
                <th className="p-3 text-right">수량</th>
                <th className="p-3 text-left">처리 담당자</th>
              </tr>
            </thead>
            <tbody>
              {mockHistory.map((h) => (
                <tr key={h.ledger_id} className="border-t border-slate-100">
                  <td className="p-3 text-xs">{new Date(h.occurred_at).toLocaleString('ko-KR')}</td>
                  <td className="p-3 font-semibold">{equipmentEventTypeLabel(h.event_type)}</td>
                  <td className="p-3">{h.catalog_name}</td>
                  <td className="p-3">{h.teacher_name}</td>
                  <td className="p-3 text-right tabular-nums">{h.qty}</td>
                  <td className="p-3">{h.created_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        </div>
      </div>

      {showRent && (
        <RentEquipmentModal
          preset={mockRentTarget}
          catalogOptions={[{ catalog_id: mockRentTarget.catalog_id, name: mockRentTarget.name, qty_available: mockRentTarget.qty_available }]}
          teacherOptions={[{ id: 't1', name: 'FixtureTeacher' }]}
          onClose={() => setShowRent(false)}
          onConfirm={async () => setShowRent(false)}
        />
      )}
      {showAdjust && (
        <AdjustStockModal
          target={mockRentTarget}
          onClose={() => setShowAdjust(false)}
          onConfirm={async () => setShowAdjust(false)}
        />
      )}
      {showReturn && (
        <ReturnEquipmentModal
          catalogName="Fixture-농구공"
          rentals={mockReturnRentals}
          onClose={() => setShowReturn(false)}
          onConfirm={async () => setShowReturn(false)}
        />
      )}
      {showStockInput && (
        <StockInputModal
          target={baseRow({ catalog_id: 9001, name: 'Fixture-농구공', opening_confirmed: false, legacy_qty_held: 2 })}
          onClose={() => setShowStockInput(false)}
          onConfirm={async () => setShowStockInput(false)}
        />
      )}
    </div>
  );
}
