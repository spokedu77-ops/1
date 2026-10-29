'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type Option = { id: string; name: string; status: string; linked: boolean };
type Detail = Omit<Option, 'linked'> & {
  contract_start: string | null; contract_end: string | null; session_fee: number | null; updated_at: string;
};

export default function SettlementCenterLink({ centerId, onSelect }: {
  centerId?: string | null; onSelect: (id: string | null) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Option[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const selectionVersion = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!query.trim()) { setResults([]); return; }
      try {
        const response = await fetch(`/api/admin/settlement-centers?q=${encodeURIComponent(query)}`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error();
        const body = await response.json();
        if (!controller.signal.aborted) { setResults(body.centers); setError(''); }
      } catch { if (!controller.signal.aborted) { setResults([]); setError('센터 검색에 실패했습니다.'); } }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    if (!centerId || !expanded) return () => controller.abort();
    fetch(`/api/admin/settlement-centers?id=${encodeURIComponent(centerId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((body) => { if (!controller.signal.aborted) { setDetail(body.center); setError(''); } })
      .catch(() => { if (!controller.signal.aborted) { setDetail(null); setError('연결 센터 조회에 실패했습니다.'); } });
    return () => controller.abort();
  }, [centerId, refresh, expanded]);

  const select = async (id: string | null) => {
    const version = ++selectionVersion.current;
    setBusy(true);
    try { await onSelect(id); if (version === selectionVersion.current) { setQuery(''); setResults([]); setDetail(null); } }
    catch { toast.error('센터 연결을 저장하지 못했습니다.'); }
    finally { if (version === selectionVersion.current) setBusy(false); }
  };

  if (!expanded) return <button type="button" className="p-2 text-xs text-indigo-700" onClick={() => setExpanded(true)}>{centerId ? '연결 센터 확인' : '센터관리 연결'}</button>;
  return <div className="min-w-[220px] space-y-2 p-2 text-xs">
    <button type="button" onClick={() => { setExpanded(false); setDetail(null); setQuery(''); setResults([]); }}>접기</button>
    <p className="font-semibold">센터관리 연결</p>
    {centerId ? <>
      <p>{detail?.id === centerId ? `${detail.name} · ${detail.status}` : centerId}</p>
      {detail?.id === centerId && <p className="text-slate-500">계약 {detail.contract_start ?? '미정'} ~ {detail.contract_end ?? '미정'}<br />회당 수업료 {detail.session_fee?.toLocaleString() ?? '미설정'} (참고)<br />수정 {detail.updated_at.slice(0, 10)}</p>}
      <div className="flex gap-3"><button type="button" disabled={busy} onClick={() => setRefresh((n) => n + 1)}>최신 정보 확인</button><button type="button" disabled={busy} onClick={() => void select(null)}>연결 해제</button></div>
    </> : <p className="text-slate-500">미연결</p>}
    <input aria-label="센터관리 기관 검색" placeholder="센터명으로 검색" maxLength={100} value={query} disabled={busy}
      onChange={(event) => { setQuery(event.target.value); setResults([]); }} className="h-9 w-full rounded border bg-white px-2" />
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {results.length > 0 && <ul className="max-h-48 overflow-auto rounded border bg-white">{results.map((item) => <li key={item.id}>
      <button type="button" disabled={busy} onClick={() => void select(item.id)} className="w-full p-2 text-left hover:bg-indigo-50">
        {item.name} · {item.status} · {item.linked ? '연결됨' : '미연결'}<span className="block text-slate-400">{item.id}</span>
      </button>
    </li>)}</ul>}
    <p className="text-slate-500">연결은 정산 단가·월별 금액을 변경하지 않습니다.</p>
  </div>;
}
