'use client';

import { useEffect, useRef, useState } from 'react';
import SettlementCenterLink from '@/app/admin/master/reports/SettlementCenterLink';
import { rateFor, currentSeoulMonthKey, type SettlementCenter } from '@/app/admin/master/reports/settlementSheetCore';

export default function CenterSettlementPanel({ id, name, onBusyChange }: { id: string; name: string; onBusyChange: (busy: boolean) => void }) {
  const [policies, setPolicies] = useState<SettlementCenter[] | null>(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [month, setMonth] = useState(currentSeoulMonthKey);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/settlement-sheet?scope=centers', { cache: 'no-store', signal: controller.signal }).then(async (response) => {
      if (response.status === 403) throw new Error('정산은 MASTER 전용입니다. 일반 관리자에게 정산 payload를 제공하지 않습니다.');
      if (!response.ok) throw new Error('정산 정보를 불러오지 못했습니다.');
      return response.json();
    }).then((body) => { if (!controller.signal.aborted) { setPolicies(Object.values(body.centers)); setError(''); } })
      .catch((reason) => { if (!controller.signal.aborted) { setPolicies(null); setError(reason.message); } });
    return () => controller.abort();
  }, [id, refresh]);
  const save = async (policy: SettlementCenter, center_id: string | null) => {
    if (saving.current) throw new Error('저장 중입니다.');
    if (!window.confirm(`${policy.name || '이름 공란 항목'}의 센터 연결을 ${center_id ? '변경' : '해제'}할까요? 정산 금액은 변경되지 않습니다.`)) return;
    saving.current = true; setBusy(true); onBusyChange(true);
    try {
      const response = await fetch('/api/admin/settlement-sheet', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'center-link', value: { id: policy.id, rev: policy.rev, center_id } }) });
      const body = await response.json();
      if (!response.ok) { setError(body.error); if (body.code === 'REVISION_CONFLICT') setRefresh((n) => n + 1); throw new Error(body.error); }
      setPolicies((rows) => rows?.map((row) => row.id === policy.id ? { ...row, center_id, rev: body.revision } : row) ?? null);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '센터 연결을 저장하지 못했습니다. 다시 조회 후 시도해 주세요.');
      throw reason;
    } finally { saving.current = false; setBusy(false); onBusyChange(false); }
  };
  const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');
  const groups = policies ? [
    { title: '연결된 정산 항목', rows: policies.filter((p) => p.center_id === id) },
    { title: '이름 일치 후보 · 관리자 확인 필요', rows: policies.filter((p) => !p.center_id && p.name.trim() && normalize(p.name) === normalize(name)) },
    { title: '수동 검토 · 이름 공란', rows: policies.filter((p) => !p.center_id && !p.name.trim()) },
    { title: '다른 정산 항목 · 수동 연결', rows: policies.filter((p) => p.center_id !== id && (p.center_id || (p.name.trim() && normalize(p.name) !== normalize(name)))) },
  ] : [];
  return <section className="space-y-5" aria-label="센터 정산 연결">
    <h2 className="text-xl font-semibold">정산 센터 연결</h2>
    <p className="text-sm text-slate-600">센터 한 곳에 여러 정산 항목을 연결할 수 있습니다. 이름 일치는 후보이며 자동 저장하지 않습니다. 연결 저장은 Stage 1 로컬 DB 전용입니다.</p>
    <label className="block text-sm">단가 적용 월 <input type="month" className="min-h-11 rounded border px-3" value={month} onChange={(e) => setMonth(e.target.value || currentSeoulMonthKey())} /></label>
    <p className="text-sm text-slate-600">금액 원본: 정산 policy 및 rates의 적용 월 기준. fee·주강사료·보조강사료·교구 대여비·cost는 centers.session_fee와 독립이며 월별 정산 원본과 확정 상태를 변경하지 않습니다.</p>
    {error && <p role="alert">{error}</p>}
    <button type="button" disabled={busy} className="min-h-11 underline" onClick={() => setRefresh((n) => n + 1)}>정산 다시 조회</button>
    {!policies && !error && <p role="status">정산 권한 및 연결 확인 중…</p>}
    {groups.map((group) => <section key={group.title} className="space-y-3 border-t pt-4">
      <h3 className="font-semibold">{group.title} ({group.rows.length})</h3>
      {!group.rows.length && <p className="text-sm text-slate-500">항목 없음</p>}
      {group.rows.map((policy) => { const rate = rateFor(policy, month); return <details key={policy.id} className="rounded-lg border bg-white p-3">
        <summary className="min-h-11 cursor-pointer break-words text-sm font-medium">{policy.name || '이름 공란 · 수동 검토'} · {policy.id}</summary>
        <dl className="grid grid-cols-1 gap-2 py-3 text-sm sm:grid-cols-2">{(['fee', 'instr', 'assist', 'rental', 'cost'] as const).map((key, i) => <div key={key}><dt className="text-slate-500">{['정산 fee (원본)', '주강사료', '보조강사료', '교구 대여비', '정산 cost'][i]}</dt><dd>{String((key === 'fee' ? policy.fee : rate[key]) ?? '') || '미등록'}</dd></div>)}</dl>
        <SettlementCenterLink centerId={policy.center_id} onSelect={(next) => save(policy, next)} />
        {policy.center_id !== id && <button type="button" disabled={busy} className="min-h-11 px-3 underline" onClick={() => void save(policy, id).catch(() => {})}>이 센터에 연결 확인</button>}
      </details>; })}
    </section>)}
  </section>;
}
