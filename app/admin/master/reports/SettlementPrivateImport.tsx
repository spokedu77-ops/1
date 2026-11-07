'use client';

import { useEffect, useState } from 'react';
import SettlementSearchSelect from './SettlementSearchSelect';
import { type SettlementMonth, type SettlementRow } from './settlementSheetCore';
import { emptyRow } from './settlementSheetCore';
import type { Unit } from '@/app/admin/centers/private-v11/types';
import { getPrivateSchedules } from '@/app/admin/centers/private-v11/core';
import styles from './SettlementSheet.module.css';
import { PRIVATE_SETTLEMENT_OPTIONS, privateSettlementDefault } from './privateSettlementDefaults';

type ImportUnit = Unit & { privateTeacherFee: number | null; groupTeacherFee: number | null };

export default function SettlementPrivateImport({ month, onAdd }: {
  month: SettlementMonth;
  onAdd: (rows: SettlementRow[]) => void;
}) {
  const [units, setUnits] = useState<ImportUnit[]>([]);
  const [ratio, setRatio] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    void (async () => {
      try {
        const response = await fetch('/api/admin/private-v11?scope=settlement-import', { cache: 'no-store', signal: controller.signal });
        const body = await response.json() as { units?: ImportUnit[]; error?: string };
        if (!response.ok || !body.units) throw new Error(body.error || '개인 DB를 불러오지 못했습니다.');
        if (!controller.signal.aborted) setUnits(body.units);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '개인 DB를 불러오지 못했습니다.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [retry]);
  const selectedUnit = units.find((unit) => `unit:${unit.id}` === selectedId);
  const schedule = (unit: Unit) => getPrivateSchedules(unit).map((slot) => `${'일월화수목금토'[slot.day]} ${slot.start}${slot.end ? `~${slot.end}` : ''}${slot.coach ? ` · ${slot.coach}` : ''}`).join(' / ') || '일정 미등록';
  const settlementName = (unit: Unit) => {
    const times = getPrivateSchedules(unit).map((slot) => {
      const match = /^(\d{2}):(\d{2})$/.exec(slot.start);
      return `${'일월화수목금토'[slot.day]}${match ? `${Number(match[1])}시${Number(match[2]) ? `${Number(match[2])}분` : ''}` : ''}`;
    }).join('');
    return [times, unit.neighborhood.trim().replace(/동$/, '')].filter(Boolean).join(' ') || unit.name;
  };
  const pricing = PRIVATE_SETTLEMENT_OPTIONS.find((option) => option.ratio === ratio) ?? (selectedUnit ? privateSettlementDefault(selectedUnit.classType) : null);
  const cost = selectedUnit && pricing ? pricing.ratio === 1 ? selectedUnit.privateTeacherFee : selectedUnit.groupTeacherFee : null;
  const canAddUnit = selectedUnit && !month.locked && !month.rows.some((row) => row.privateUnitId === selectedUnit.id)
    && pricing && cost != null && Number.isSafeInteger(cost) && cost >= 0 && Number.isSafeInteger(cost * pricing.sessions);
  return <div className={styles.privateImport}>
    <SettlementSearchSelect label="개인수업명 검색 또는 선택" selectedLabel={selectedUnit?.name} query={query} onQueryChange={setQuery}
      loading={loading} error={error} onRetry={() => setRetry((value) => value + 1)}
      options={units.filter((unit) => `${unit.name} ${unit.coach} ${schedule(unit)}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map((unit) => ({
        id: `unit:${unit.id}`, label: unit.name, detail: schedule(unit), disabled: month.rows.some((row) => row.privateUnitId === unit.id),
      }))} onSelect={(id) => { setSelectedId(id); setRatio(null); }} />
    {selectedUnit && <div className="mt-3 space-y-3">
      <p className="text-sm font-semibold">{selectedUnit.name} · {schedule(selectedUnit)}</p>
      {!privateSettlementDefault(selectedUnit.classType) && <label className="grid gap-1 text-sm"><span>수업 인원 확인 · {selectedUnit.classType}</span>
        <select className="min-h-11 rounded-lg border px-3" value={ratio ?? ''} onChange={(event) => setRatio(Number(event.target.value) || null)}>
          <option value="">수업 형태 선택</option>{PRIVATE_SETTLEMENT_OPTIONS.map((option) => <option key={option.ratio} value={option.ratio}>{option.label}</option>)}
        </select></label>}
      {pricing && <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2">
        <p>회당 수업료 <strong>{pricing.fee.toLocaleString('ko-KR')}원</strong></p>
        <p>회당 강사료 <strong>{cost == null ? '강사 배정 확인 필요' : `${cost.toLocaleString('ko-KR')}원`}</strong></p>
        <p>{pricing.label} · 기본 {pricing.sessions}회</p>
        <p>총 수업료 <strong>{(pricing.fee * pricing.sessions).toLocaleString('ko-KR')}원</strong></p>
        <p>총 강사료 <strong>{cost == null ? '미확정' : `${(cost * pricing.sessions).toLocaleString('ko-KR')}원`}</strong></p>
      </div>}
      {pricing && cost == null && <p role="alert" className="text-xs text-red-600">개인 DB의 담당 강사 연결을 확인해 주세요. 일정별 강사 단가가 다르면 단가별 정산이 필요합니다.</p>}
      <button type="button" className={styles.primaryButton} disabled={!canAddUnit} onClick={() => {
        if (!canAddUnit || !pricing || cost == null) return;
        onAdd([{ ...emptyRow(), privateUnitId: selectedUnit.id, type: 'private', name: settlementName(selectedUnit), vatMode: 'none',
          fee: pricing.fee, cost: `${cost}*회기`, sessions: pricing.sessions, note: schedule(selectedUnit) }]);
      }}>이 달에 추가</button>
    </div>}
  </div>;
}
