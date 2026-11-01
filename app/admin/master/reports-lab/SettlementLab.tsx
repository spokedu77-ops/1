'use client';

import { useEffect, useMemo, useState } from 'react';
import { summarize, type SettlementSheetData } from '../reports/settlementSheetCore';
import LabSettlementSheet from './LabSettlementSheet';
import { createLabTransport } from './labTransport';

const amount = (value: number) => value.toLocaleString('ko-KR');

export default function SettlementLab() {
  const [baseline, setBaseline] = useState<SettlementSheetData | null>(null);
  const [draft, setDraft] = useState<SettlementSheetData | null>(null);
  const [writable, setWritable] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const read = async (url: string) => {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 403 ? 'MASTER 권한이 필요합니다.' : '운영 스냅샷을 불러오지 못했습니다.');
      return response.json();
    };
    read('/api/admin/settlement-lab').then((sheet) => {
      if (!controller.signal.aborted) { setBaseline(sheet); setDraft(structuredClone(sheet)); setError(''); }
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [retry]);
  const transport = useMemo(() => baseline ? createLabTransport(baseline, writable, setDraft) : null, [baseline, writable]);
  const current = draft ?? baseline;
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

    </section>
    <fieldset disabled={!writable} className="min-w-0 border-0 p-0" aria-label={writable ? '격리 정산 편집' : '운영 정산 읽기 전용'}>
      <legend className="sr-only">{writable ? '격리 정산 편집' : '운영 스냅샷 · 편집하려면 격리 복사본 만들기'}</legend>
      <LabSettlementSheet key={`${generation}-${writable}`} request={transport.request} />
    </fieldset>
  </>;
}
