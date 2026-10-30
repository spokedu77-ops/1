'use client';

import { useEffect, useMemo, useState } from 'react';
import { summarize, type SettlementSheetData } from '../reports/settlementSheetCore';
import CenterTeacherFees from '@/app/admin/centers/components/CenterTeacherFees';
import LabSettlementSheet from './LabSettlementSheet';
import { createLabTransport } from './labTransport';

type CenterReference = { id: string; name: string; session_fee: number | null; main_teacher_id: string | null; main_teacher_2_id: string | null; main_teacher_3_id: string | null };
const amount = (value: number) => value.toLocaleString('ko-KR');
const policyAmount = (value: string | number | null | undefined) => value == null || value === '' ? '미등록' : String(value);

export default function SettlementLab() {
  const [baseline, setBaseline] = useState<SettlementSheetData | null>(null);
  const [draft, setDraft] = useState<SettlementSheetData | null>(null);
  const [centers, setCenters] = useState<CenterReference[]>([]);
  const [writable, setWritable] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const read = async (url: string) => {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 403 ? 'MASTER 권한이 필요합니다.' : '운영 스냅샷을 불러오지 못했습니다.');
      return response.json();
    };
    Promise.all([read('/api/admin/settlement-lab'), read('/api/admin/settlement-lab?scope=context')]).then(([sheet, context]) => {
      if (!controller.signal.aborted) { setBaseline(sheet); setDraft(structuredClone(sheet)); setCenters(context.centers); setError(''); }
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [retry]);
  const transport = useMemo(() => baseline ? createLabTransport(baseline, writable, centers.map((center) => center.id), setDraft) : null, [baseline, writable, centers]);
  const current = draft ?? baseline;
  const policy = current?.centers[selectedPolicy];
  const center = centers.find((item) => item.id === policy?.center_id);
  const months = baseline && current ? [...new Set([...Object.keys(baseline.months), ...Object.keys(current.months)])].sort() : [];
  const reset = () => {
    if (!window.confirm('격리 복사본을 폐기하고 처음 읽은 운영 스냅샷으로 돌아갈까요? 운영 DB는 변경되지 않습니다.')) return;
    setWritable(false); setDraft(baseline ? structuredClone(baseline) : null); setGeneration((value) => value + 1);
  };
  if (error) return <div className="p-6"><p role="alert">{error}</p><button className="min-h-11 underline" onClick={() => setRetry((value) => value + 1)}>다시 조회</button></div>;
  if (!baseline || !current || !transport) return <p role="status" className="p-6">MASTER 운영 스냅샷 읽는 중…</p>;
  return <>
    <section className="mx-auto max-w-[1400px] space-y-4 px-4 py-5" aria-label="정산 LAB 작업 환경">
      <h1 className="text-2xl font-semibold">정산 LAB</h1>
      <p role="status" className="text-sm font-semibold">{writable ? '격리 편집 중 · 저장 대상: 이 탭의 메모리 복사본' : '운영 스냅샷 읽기 전용 · 저장 비활성'}</p>
      <p className="text-sm text-slate-600">운영 DB에는 쓰지 않습니다. 격리 복사본은 새로고침·페이지 이동 시 폐기됩니다. 기존 페이지로 돌아가도 운영 DB 복원 작업은 발생하지 않습니다.</p>
      <div className="flex flex-wrap gap-2">
        {!writable && <button type="button" className="min-h-11 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white" onClick={() => { setWritable(true); setGeneration((value) => value + 1); }}>격리 복사본 만들기</button>}
        {writable && <button type="button" className="min-h-11 rounded-lg border px-4 text-sm" onClick={reset}>격리 복사본 폐기</button>}
      </div>
      <details open className="border-y border-slate-200 py-4">
        <summary className="min-h-11 cursor-pointer font-semibold">기존 정산 계산 비교 · 최초 스냅샷 대비</summary>
        <p className="mb-3 text-sm text-slate-600">양쪽 모두 기존 summarize / calculateRow를 사용합니다. 운영 값과 자동 동기화하지 않으며, 단가는 centers.session_fee와 구분합니다.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['월', '기존 총액', 'LAB 총액', '차이', '기존 경비 / LAB', '기존 VAT / LAB', '기존 순수익 / LAB'].map((label) => <th className="whitespace-nowrap p-2" key={label}>{label}</th>)}</tr></thead><tbody>
          {months.map((key) => {
            const before = summarize(baseline.months[key]?.rows ?? [], baseline.settings);
            const after = summarize(current.months[key]?.rows ?? [], current.settings);
            return <tr key={key} className="border-t"><th className="p-2">{key}</th>{[amount(before.total), amount(after.total), amount(after.total - before.total), `${amount(before.cost)} / ${amount(after.cost)}`, `${amount(before.vat)} / ${amount(after.vat)}`, `${amount(before.net)} / ${amount(after.net)}`].map((value, index) => <td key={index} className="whitespace-nowrap p-2 tabular-nums">{value}</td>)}</tr>;
          })}
        </tbody></table></div>
      </details>
      <details className="border-b border-slate-200 pb-4">
        <summary className="min-h-11 cursor-pointer font-semibold">센터 UUID · 수업료·강사료·교구 대여비 원본 검증</summary>
        <label className="block text-sm">정산 항목 <select aria-label="검증할 정산 항목" className="my-3 min-h-11 max-w-full rounded border px-3" value={selectedPolicy} onChange={(event) => setSelectedPolicy(event.target.value)}><option value="">선택</option>{Object.values(current.centers).map((item) => <option value={item.id} key={item.id}>{item.name || '이름 공란'} · {item.id}</option>)}</select></label>
        {policy && <div className="space-y-3 text-sm">
          <p className="break-all">센터 UUID: {policy.center_id || '미연결'}</p>
          <p>센터 회당 청구 수업료: {center?.session_fee == null ? '미등록 / 미연결' : `${amount(center.session_fee)}원`} · 원본 centers.session_fee</p>
          <p>정산 fee: {policyAmount(policy.fee)} · 주강사료 {policyAmount(policy.instr)} · 보조강사료 {policyAmount(policy.assist)} · 교구 대여비 {policyAmount(policy.rental)} · 원본 policy (rates 적용 전)</p>
          <p className="text-slate-600">금액이 달라도 덮어쓰지 않습니다. UUID 연결은 아래 기관 DB에서 명시적으로 선택합니다. 강사 단가는 센터에 배정된 UUID로 자동 조회하며 정산 policy에 자동 저장하지 않습니다.</p>
          <CenterTeacherFees key={center?.id ?? 'unlinked'} ids={[center?.main_teacher_id, center?.main_teacher_2_id, center?.main_teacher_3_id]} />
        </div>}
      </details>
    </section>
    <fieldset disabled={!writable} className="min-w-0 border-0 p-0" aria-label={writable ? '격리 정산 편집' : '운영 정산 읽기 전용'}>
      <legend className="sr-only">{writable ? '격리 정산 편집' : '운영 스냅샷 · 편집하려면 격리 복사본 만들기'}</legend>
      <LabSettlementSheet key={`${generation}-${writable}`} request={transport.request} />
    </fieldset>
  </>;
}
