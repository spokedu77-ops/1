'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileDown, Lock, MoreHorizontal, Plus, Redo2, Save, Settings, Trash2, Undo2, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import SettlementCenterLink from './SettlementCenterLink';
import MoneyInput from './SettlementMoneyInput';
import { formatMoneyExpression, formatSettlementAmount } from './settlementMoney';
import styles from './SettlementSheet.module.css';
import {
  calculateRow, carryOver, centerFee, emptyRow, resolveDefaultSettlementMonth, rowFromCenter, summarize, uid,
  type CenterType, type SettlementCenter, type SettlementMonth, type SettlementRow,
  type SettlementSettings, type SettlementSheetData,
} from './settlementSheetCore';

type View = 'month' | 'year' | 'centers';
type XLSXApi = {
  read(data: ArrayBuffer, options: object): { SheetNames: string[]; Sheets: Record<string, Record<string, { v?: unknown; f?: string }>> };
  writeFile(workbook: unknown, filename: string): void;
  utils: {
    decode_range(ref: string): { s: { c: number }; e: { c: number; r: number } };
    encode_col(index: number): string;
    book_new(): unknown;
    book_append_sheet(workbook: unknown, sheet: unknown, name: string): void;
    aoa_to_sheet(data: unknown[][]): Record<string, unknown>;
  };
};
declare global { interface Window { XLSX?: XLSXApi } }

const EMPTY_DATA: SettlementSheetData = { months: {}, centers: {}, settings: { vatMethod: 'sheet', year: new Date().getFullYear() } };
const fieldClass = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-indigo-500 disabled:bg-slate-100';
const primaryButton = 'spm-btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:cursor-not-allowed';
const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const money = (value: number) => `${Math.round(value || 0).toLocaleString('ko-KR')}원`;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const sortedMonths = (data: SettlementSheetData) => Object.values(data.months).sort((a, b) => a.key.localeCompare(b.key));

function newCenter(type: CenterType): SettlementCenter {
  return { id: uid(), name: '', type, instr: '', assist: '', rental: '', fee: '', cost: '', sessions: '',
    vat: type === 'private' ? 'none' : 'auto', whRate: 0, status: 'active', note: '', ord: Date.now(),
    rates: [], termType: 'end', termValue: 0, rev: '' };
}

async function loadXlsx() {
  if (window.XLSX) return window.XLSX;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.integrity = 'sha512-r22gChDnGvBylk90+2e/ycr3RVrDi8DIOkIGNhJlKfuyQM+kK6VEJq/rLcJq88PQJ0VYNSm8O2VYdOXsKjHDQw==';
    script.crossOrigin = 'anonymous'; script.onload = () => resolve(); script.onerror = () => reject(new Error('xlsx'));
    document.head.appendChild(script);
  });
  if (!window.XLSX) throw new Error('xlsx');
  return window.XLSX;
}

export default function SettlementSheet() {
  const [data, setData] = useState<SettlementSheetData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('month');
  const [currentKey, setCurrentKey] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'wait' | 'invoice' | 'unpaid'>('all');
  const [centerTab, setCenterTab] = useState<'center' | 'private'>('center');
  const [saveState, setSaveState] = useState('저장됨');
  const [history, setHistory] = useState<Record<string, SettlementRow[][]>>({});
  const [future, setFuture] = useState<Record<string, SettlementRow[][]>>({});
  const restoreRef = useRef<HTMLInputElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editVersion = useRef(0);
  const pendingMonth = useRef<SettlementMonth | null>(null);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef({ data, currentKey });
  const mounted = useRef(true);
  useEffect(() => { latest.current = { data, currentKey }; }, [data, currentKey]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const policiesRequest = useRef<Promise<Record<string, SettlementCenter>> | null>(null);
  const policiesLoaded = useRef(false);
  const loadPolicies = async (): Promise<Record<string, SettlementCenter> | null> => {
    if (policiesLoaded.current) return data.centers;
    try {
      const request = policiesRequest.current ?? fetch('/api/admin/settlement-sheet?scope=centers', { cache: 'no-store' }).then(async (response) => {
        if (!response.ok) throw new Error('policy load');
        return (await response.json()).centers as Record<string, SettlementCenter>;
      });
      policiesRequest.current = request;
      const centers = await request;
      setData((state) => ({ ...state, centers }));
      policiesLoaded.current = true;
      return centers;
    } catch { toast.error('정산 기관 정보를 불러오지 못했습니다.'); return null; }
    finally { policiesRequest.current = null; }
  };

  const reload = useCallback(async () => {
    setLoading(true);
    policiesLoaded.current = false;
    try {
      const response = await fetch('/api/admin/settlement-sheet?scope=sheet', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const next = await response.json() as SettlementSheetData;
      setData(next);
      setCurrentKey((value) => resolveDefaultSettlementMonth(next, value));
    } catch { toast.error('정산 시트 데이터를 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (!pendingMonth.current) return; event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, []);

  const current = currentKey ? data.months[currentKey] : undefined;
  const centers = useMemo(() => Object.values(data.centers).sort((a, b) => a.ord - b.ord), [data.centers]);
  const summary = useMemo(() => current ? summarize(current.rows, data.settings) : null, [current, data.settings]);

  const saveMonth = async (month: SettlementMonth, expectedRevision = month.rev) => {
    setSaveState('저장 중…');
    const response = await fetch('/api/admin/settlement-sheet', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'month', value: month, expectedRevision: expectedRevision || undefined }) });
    const result = await response.json() as { revision?: string; lockedAt?: string | null; error?: string };
    if (!response.ok || !result.revision) { setSaveState('저장 실패'); throw new Error(result.error || '저장 실패'); }
    setData((state) => ({ ...state, months: { ...state.months, [month.key]: {
      ...(state.months[month.key] ?? month), rev: result.revision!, locked: month.locked, lockedAt: result.lockedAt ?? null,
    } } }));
    if (pendingMonth.current?.key === month.key && pendingMonth.current.rev === expectedRevision) {
      pendingMonth.current = { ...pendingMonth.current, rev: result.revision };
    }
    setSaveState('저장됨');
  };
  const saveCenter = async (center: SettlementCenter) => {
    setSaveState('저장 중…');
    const response = await fetch('/api/admin/settlement-sheet', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'center', value: center }) });
    const result = await response.json() as { revision?: string; error?: string };
    if (!response.ok || !result.revision) { setSaveState('저장 실패'); throw new Error(result.error || '저장 실패'); }
    setData((state) => ({ ...state, centers: { ...state.centers, [center.id]: { ...center, rev: result.revision! } } }));
    setSaveState('저장됨');
  };
  const scheduleMonthSave = (month: SettlementMonth) => {
    pendingMonth.current = month;
    const version = ++editVersion.current;
    setSaveState('저장 중…');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveChain.current = saveChain.current.then(async () => {
        const pending = pendingMonth.current;
        if (!pending || pending.key !== month.key) return;
        try {
          await saveMonth(pending, pending.rev);
          if (editVersion.current === version) pendingMonth.current = null;
        } catch (error) { toast.error((error as Error).message); }
      });
    }, 700);
  };
  const saveSettings = async (settings: SettlementSettings) => {
    const response = await fetch('/api/admin/settlement-sheet', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'settings', value: settings }) });
    if (!response.ok) return toast.error('설정을 저장하지 못했습니다.');
    setData((state) => ({ ...state, settings })); toast.success('설정을 저장했습니다.');
  };
  const configureSettings = () => {
    const useDiv11 = window.confirm(`현재 방식: ${data.settings.vatMethod === 'div11' ? '총액 ÷ 11' : '총액 × (1−0.9091)'}\n\n확인: 총액 ÷ 11 (반올림)\n취소: 기존 시트 방식`);
    const rawYear = window.prompt('정산 시트 기본 연도', String(data.settings.year));
    const year = Number(rawYear);
    if (!Number.isInteger(year) || year < 2000 || year > 2200) return;
    void saveSettings({ vatMethod: useDiv11 ? 'div11' : 'sheet', year });
  };
  const centerFromRow = (row: SettlementRow, order: number): SettlementCenter => {
    const expression = String(row.fee ?? '').replace(/^=/, '').replace(/,/g, '').replace(/원/g, '');
    const parts = expression.split('+').map(Number);
    return { ...newCenter(row.type || 'regular'), id: row.centerId || uid(), name: row.name,
      instr: Number.isFinite(parts[0]) ? parts[0] : row.fee, assist: parts.length === 3 ? parts[1] : '',
      rental: parts.length === 2 ? parts[1] : parts.length === 3 ? parts[2] : '', cost: String(row.cost).replace(/\*?(회기|C|N)/g, ''),
      sessions: row.sessions, vat: row.vatMode === 'none' ? 'none' : 'auto', whRate: row.whRate, ord: Date.now() + order };
  };
  const syncCentersFromMonths = async (onlyCurrent: boolean) => {
    const loaded = await loadPolicies(); if (!loaded) return;
    const centers = Object.values(loaded);
    const existing = new Set(centers.map((center) => center.name.trim()).filter(Boolean));
    const source = (onlyCurrent && current ? [current] : sortedMonths(data).reverse());
    const additions: SettlementCenter[] = [];
    for (const month of source) for (const row of month.rows) {
      const name = row.name.trim();
      if (row.kind === 'section' || !name || existing.has(name) || (row.fee === '' && row.cost === '' && row.total === '')) continue;
      const center = centerFromRow(row, additions.length); additions.push(center); existing.add(name);
    }
    if (!additions.length) return toast.info('새로 추가할 기관이 없습니다.');
    for (const center of additions) await saveCenter(center);
    toast.success(`${additions.length}곳을 기관 DB에 추가했습니다.`);
  };
  const syncCentersToMonths = async () => {
    const loaded = await loadPolicies(); if (!loaded) return;
    const centers = Object.values(loaded);
    let updated = 0;
    for (const month of sortedMonths(data)) {
      if (month.locked) continue;
      let changed = false;
      const rows = month.rows.map((row) => {
        if (row.kind === 'section') return row;
        const center = loaded[row.centerId] ?? centers.find((item) => item.name.trim() === row.name.trim());
        if (!center) return row;
        const fresh = rowFromCenter(center, month.key); changed = true;
        return { ...row, fee: fresh.fee, cost: fresh.cost, vatMode: fresh.vatMode, whRate: fresh.whRate, dueDate: fresh.dueDate, centerId: center.id, type: center.type };
      });
      if (changed) { await saveMonth({ ...month, rows }); updated += 1; }
    }
    toast.success(updated ? `미확정 월 ${updated}건에 최신 요율을 반영했습니다.` : '변경할 미확정 월이 없습니다.');
  };
  const updateMonthRows = (month: SettlementMonth, nextRows: SettlementRow[]) => {
    if (month.locked) return;
    setHistory((state) => ({ ...state, [month.key]: [...(state[month.key] ?? []), clone(month.rows)].slice(-50) }));
    setFuture((state) => ({ ...state, [month.key]: [] }));
    const nextMonth = { ...month, rows: nextRows };
    setData((state) => ({ ...state, months: { ...state.months, [month.key]: nextMonth } }));
    scheduleMonthSave(nextMonth);
  };
  const updateRows = (nextRows: SettlementRow[]) => { if (current) updateMonthRows(current, nextRows); };
  const applyPolicyByName = async (monthKey: string, rowId: string, name: string) => {
    const loaded = await loadPolicies();
    if (!loaded || !mounted.current || latest.current.currentKey !== monthKey) return;
    const month = latest.current.data.months[monthKey];
    const row = month?.rows.find((item) => item.id === rowId);
    if (!month || month.locked || !row || row.name !== name || row.fee !== '' || row.cost !== '') return;
    const policy = Object.values(loaded).find((item) => item.name.trim() === name.trim());
    if (!policy) return;
    // Preserve the existing policy-name convenience without linking an operational center by name.
    const replacement = { ...rowFromCenter(policy, monthKey), id: row.id, name: row.name,
      total: row.total, inv: row.inv, rcpt: row.rcpt, rcptAmt: row.rcptAmt,
      invDate: row.invDate, rcptDate: row.rcptDate, adj: row.adj, note: row.note };
    updateMonthRows(month, month.rows.map((item) => item.id === rowId ? replacement : item));
  };
  const updateRow = (id: string, patch: Partial<SettlementRow>) => current && updateRows(current.rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  const persistCurrent = async () => {
    if (!current || current.locked) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    pendingMonth.current = null;
    try { await saveMonth(current); } catch (error) { toast.error((error as Error).message); }
  };

  const undo = () => {
    if (!current || !(history[current.key]?.length)) return;
    const stack = history[current.key]; const previous = stack[stack.length - 1];
    setHistory((state) => ({ ...state, [current.key]: stack.slice(0, -1) }));
    setFuture((state) => ({ ...state, [current.key]: [...(state[current.key] ?? []), clone(current.rows)] }));
    setData((state) => ({ ...state, months: { ...state.months, [current.key]: { ...current, rows: previous } } }));
    scheduleMonthSave({ ...current, rows: previous });
  };
  const redo = () => {
    if (!current || !(future[current.key]?.length)) return;
    const stack = future[current.key]; const next = stack[stack.length - 1];
    setFuture((state) => ({ ...state, [current.key]: stack.slice(0, -1) }));
    setHistory((state) => ({ ...state, [current.key]: [...(state[current.key] ?? []), clone(current.rows)] }));
    setData((state) => ({ ...state, months: { ...state.months, [current.key]: { ...current, rows: next } } }));
    scheduleMonthSave({ ...current, rows: next });
  };

  const createMonth = async () => {
    const suggested = new Date().toISOString().slice(0, 7);
    const key = window.prompt('새 달을 YYYY-MM 형식으로 입력하세요.', suggested);
    if (!key || !/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) return;
    if (data.months[key]) { setCurrentKey(key); setView('month'); return; }
    const previous = sortedMonths(data).filter((month) => month.key < key).at(-1);
    const source = window.confirm('확인: 센터 DB의 정규 수업으로 시작\n취소: 이전 달을 복사하거나 빈 달로 시작') ? 'db'
      : previous && window.confirm('이전 달을 복사할까요?\n취소하면 빈 달로 시작합니다.') ? 'copy' : 'blank';
    const loaded = source === 'db' ? await loadPolicies() : {};
    if (!loaded) return;
    const centers = Object.values(loaded);
    const rows = source === 'db' ? [section('[정규 수업 : 다회기]', 'regular'), ...centers.filter((center) => center.type === 'regular' && center.status !== 'ended').map((center) => rowFromCenter(center, key)),
      section('[단기 수업 : 단회기]', 'short'), section('[개인 수업]', 'private'), section('[기타]', 'etc')]
      : source === 'copy' && previous ? carryOver(previous.rows) : [];
    const month: SettlementMonth = { key, label: `${Number(key.slice(5))}월 수업료`, rows, rev: '', locked: false, lockedAt: null };
    try { await saveMonth(month, ''); setCurrentKey(key); setView('month'); toast.success('새 달을 만들었습니다.'); } catch (error) { toast.error((error as Error).message); }
  };
  const toggleLock = async () => {
    if (!current) return;
    if (!window.confirm(current.locked ? '이 달의 확정을 해제할까요?' : '확정하면 읽기 전용이 됩니다. 계속할까요?')) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    pendingMonth.current = null;
    try { await saveChain.current; await saveMonth({ ...current, locked: !current.locked, lockedAt: !current.locked ? new Date().toISOString() : null }); toast.success(current.locked ? '확정을 해제했습니다.' : '이 달을 확정했습니다.'); }
    catch (error) { toast.error((error as Error).message); }
  };
  const deleteMonth = async () => {
    if (!current || current.locked || !window.confirm(`${current.label}을 삭제할까요?`)) return;
    const response = await fetch(`/api/admin/settlement-sheet?kind=month&id=${encodeURIComponent(current.key)}`, { method: 'DELETE' });
    if (!response.ok) { toast.error('월을 삭제하지 못했습니다.'); return; }
    await reload(); toast.success('월을 삭제했습니다.');
  };

  const backup = async () => {
    const centers = await loadPolicies(); if (!centers) return;
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...data, centers }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `수업료 백업 ${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href);
  };
  const restore = async (file: File) => {
    try {
      const value = JSON.parse(await file.text()) as SettlementSheetData;
      if (!value.months || !value.centers || !value.settings || !window.confirm('현재 정산 시트 전체를 백업 내용으로 교체할까요?')) return;
      const response = await fetch('/api/admin/settlement-sheet', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'restore', value }) });
      if (!response.ok) throw new Error(); await reload(); toast.success('백업을 복원했습니다.');
    } catch { toast.error('백업 파일을 복원하지 못했습니다.'); }
  };

  const exportExcel = async (all = false) => {
    try {
      const xlsx = await loadXlsx(); const workbook = xlsx.utils.book_new(); const months = all ? sortedMonths(data) : current ? [current] : [];
      for (const month of months) {
        const rows: unknown[][] = [['기관명','수업료','회기','총액','계산서 발행 여부','영수여부','부가세','경비(인건비)','세액 제외','비고','발행일','영수일','영수금액']];
        month.rows.forEach((row) => { const value = calculateRow(row, data.settings); rows.push([row.name,row.fee,row.sessions,value.total,row.inv?'O':'',row.rcpt?'O':'',value.vat,row.cost,value.net,row.note,row.invDate,row.rcptDate,row.rcptAmt ?? '']); });
        xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), month.label.slice(0, 31));
      }
      xlsx.writeFile(workbook, all ? '수업료 정산.xlsx' : `수업료 정산 ${current?.label ?? ''}.xlsx`);
    } catch { toast.error('Excel 파일을 만들지 못했습니다.'); }
  };

  if (loading) return <div className="py-24 text-center text-sm font-bold text-slate-500">정산 시트를 불러오는 중…</div>;
  return <div className={`${styles.sheet} mx-auto w-full max-w-[1400px] px-3 pb-32 pt-5 sm:px-4`}>
    <header className={styles.header}>
      <div className={styles.brand}><span className={styles.mark} aria-hidden="true">₩</span><div><h1 className={styles.heading}>수업료 정산</h1><p className={styles.subheading}>{view === 'month' ? current?.label ?? '월을 만들어 시작하세요' : view === 'year' ? '연간 대시보드' : '센터 · 개인수업 DB'} · {saveState}</p></div></div>
      <div className={styles.headerActions}>
        <button className={styles.secondaryButton} onClick={() => void exportExcel(false)} disabled={!current}><FileDown size={14}/>현재 월</button>
        <button className={styles.secondaryButton} onClick={() => void backup()}><Download size={14}/>백업</button>
        <button className={styles.secondaryButton} onClick={configureSettings}><Settings size={14}/>설정</button>
        <details className="relative"><summary className={styles.moreSummary}><MoreHorizontal size={18}/></summary><div className="absolute right-0 z-20 mt-2 grid w-44 gap-1 rounded-xl border bg-white p-2 shadow-xl"><button className="p-2 text-left text-sm" onClick={() => void exportExcel(true)}>전체 Excel 내보내기</button><button className="p-2 text-left text-sm" onClick={() => restoreRef.current?.click()}>백업 복원</button></div></details>
      </div>
    </header>
    <input ref={restoreRef} hidden type="file" accept=".json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void restore(file); event.target.value=''; }}/>
    <nav className={styles.monthBar}>
      <div className={styles.monthGroup}>{sortedMonths(data).map((month) => <button key={month.key} onClick={() => { setCurrentKey(month.key); setView('month'); }} className={`${styles.monthTab} ${view==='month'&&currentKey===month.key?styles.monthTabActive:''}`}>{Number(month.key.slice(5))}월{month.locked?' 🔒':''}</button>)}<button onClick={createMonth} className={`${styles.monthTab} ${styles.monthAdd}`}><Plus size={13} className="inline"/> 새 달</button></div>
      <div className={styles.monthGroup}><button onClick={() => setView('year')} className={`${styles.monthTab} ${view==='year'?styles.viewTabActive:''}`}>연간 대시보드</button><button onClick={() => { void loadPolicies().then((loaded) => { if (loaded) setView('centers'); }); }} className={`${styles.monthTab} ${view==='centers'?styles.viewTabActive:''}`}>센터 · 개인수업 DB</button></div>
    </nav>
    {view === 'month' ? <MonthView applyPolicyByName={applyPolicyByName} loadPolicies={loadPolicies} month={current} settings={data.settings} summary={summary} centers={centers} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} updateRow={updateRow} updateRows={updateRows} persist={persistCurrent} toggleLock={toggleLock} deleteMonth={deleteMonth} undo={undo} redo={redo} canUndo={Boolean(current&&history[current.key]?.length)} canRedo={Boolean(current&&future[current.key]?.length)}/>
      : view === 'year' ? <YearView data={data} selectMonth={(key) => { setCurrentKey(key); setView('month'); }}/>
        : <CentersView
            centers={centers} tab={centerTab} setTab={setCenterTab} save={saveCenter}
            fromCurrent={()=>void syncCentersFromMonths(true)} fromAll={()=>void syncCentersFromMonths(false)}
            syncMonths={()=>void syncCentersToMonths()}
            remove={async (center) => {
              if (!confirm(`${center.name || '이 항목'}을 삭제할까요?`)) return;
              const response=await fetch(`/api/admin/settlement-sheet?kind=center&id=${center.id}`,{method:'DELETE'});
              if(response.ok){setData((state)=>{const next={...state.centers};delete next[center.id];return {...state,centers:next};});}
            }}
            add={() => {
              const center=newCenter(centerTab==='private'?'private':'regular');
              setData((state)=>({...state,centers:{...state.centers,[center.id]:center}}));
              void saveCenter(center);
            }}/>}
  </div>;
}

const section = (name: string, type: CenterType): SettlementRow => ({ ...emptyRow(), kind: 'section', name, type });

function MonthView({ applyPolicyByName, loadPolicies, month, settings, summary, centers, query, setQuery, filter, setFilter, updateRow, updateRows, persist, toggleLock, deleteMonth, undo, redo, canUndo, canRedo }: {
  applyPolicyByName: (monthKey: string, rowId: string, name: string) => Promise<void>;
  loadPolicies: () => Promise<Record<string, SettlementCenter> | null>;
  month?: SettlementMonth; settings: SettlementSettings; summary: ReturnType<typeof summarize> | null; centers: SettlementCenter[]; query: string; setQuery:(value:string)=>void;
  filter:'all'|'wait'|'invoice'|'unpaid'; setFilter:(value:'all'|'wait'|'invoice'|'unpaid')=>void; updateRow:(id:string,patch:Partial<SettlementRow>)=>void; updateRows:(rows:SettlementRow[])=>void;
  persist:()=>Promise<void>; toggleLock:()=>Promise<void>; deleteMonth:()=>Promise<void>; undo:()=>void; redo:()=>void; canUndo:boolean; canRedo:boolean;
}) {
  if (!month || !summary) return <div className="rounded-2xl border bg-white p-16 text-center"><p className="font-bold">아직 정산 데이터가 없습니다.</p><p className="mt-2 text-sm text-slate-500">새 달을 만들어 정산을 시작하세요.</p></div>;
  const rows = month.rows.filter((row) => row.kind === 'row');
  const waiting = rows.filter((row) => row.fee !== '' && row.sessions === '' && row.total === '' && !calculateRow(row, settings).total).length;
  const visible = month.rows.filter((row) => row.kind === 'section'
    ? filter === 'all' && !query
    : (!query || `${row.name} ${row.note}`.toLowerCase().includes(query.toLowerCase()))
      && (filter==='all'||filter==='wait'&&row.fee!==''&&row.sessions===''&&row.total===''&&!calculateRow(row,settings).total||filter==='invoice'&&!row.inv&&row.vatMode!=='none'||filter==='unpaid'&&calculateRow(row,settings).outstanding>0));
  return <div className="space-y-3">
    {month.locked && <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"><span>🔒 이 달은 확정되어 읽기 전용입니다.</span><button onClick={toggleLock}>확정 해제</button></div>}
    <section className={styles.summaryGrid}>
      <div className={styles.hero}><p className={styles.heroLabel}>확정 수익 · 영수 완료분</p><p className={styles.heroValue}>{money(summary.receivedNetAfterWh)}</p><p className={styles.heroFoot}><span>입금 {money(summary.received)}</span><span>미수 {money(summary.unpaidAmount)} <small>(회수 시 예상 순수익 {money(summary.outstandingNetAfterWh)})</small></span></p></div>
      <div className={styles.metrics}>{[['총액',summary.total],['세액 제외',summary.net],['경비',summary.cost],['부가세',summary.vat]].map(([label,value])=><div key={String(label)} className={styles.metric}><p className={styles.metricLabel}>{label}</p><p className={styles.metricValue}>{money(Number(value))}</p></div>)}</div>
    </section>
    <div className={styles.filterRow}>
      <button className={`${styles.filterChip} ${filter==='all'?styles.filterChipActive:''}`} onClick={()=>setFilter('all')}>전체 <b>{rows.length}</b></button>
      <button className={`${styles.filterChip} ${filter==='wait'?styles.filterChipActive:''}`} onClick={()=>setFilter(filter==='wait'?'all':'wait')}>회기 입력 대기 <b>{waiting}</b></button>
      <button className={`${styles.filterChip} ${filter==='invoice'?styles.filterChipActive:''}`} onClick={()=>setFilter(filter==='invoice'?'all':'invoice')}>계산서 미발행 <b>{summary.noInvoice}</b></button>
      <button className={`${styles.filterChip} ${filter==='unpaid'?styles.filterChipActive:''}`} onClick={()=>setFilter(filter==='unpaid'?'all':'unpaid')}>영수 미완료 <b>{summary.unpaid}</b>{summary.unpaidAmount>0&&` · ${money(summary.unpaidAmount)}`}</button>
      <span className="flex-1"/><button aria-label="실행 취소" title="실행 취소" disabled={!canUndo||month.locked} onClick={undo} className={styles.historyButton}><Undo2 size={16}/></button><button aria-label="다시 실행" title="다시 실행" disabled={!canRedo||month.locked} onClick={redo} className={styles.historyButton}><Redo2 size={16}/></button>
    </div>
    <div className={styles.toolbar}>
      <input className={styles.search} type="search" placeholder="기관명·비고 검색" aria-label="기관명·비고 검색" value={query} onChange={(event)=>setQuery(event.target.value)}/>
      <div className={styles.toolbarActions}><button className={styles.secondaryButton} onClick={toggleLock}>{month.locked?<Unlock size={14}/>:<Lock size={14}/>} {month.locked?'확정 해제':'이 달 확정'}</button><button className={styles.secondaryButton} disabled={month.locked} onClick={()=>void loadPolicies().then((loaded)=>{if(loaded)updateRows([...month.rows,...Object.values(loaded).filter((center)=>center.type==='regular'&&center.status!=='ended'&&!month.rows.some((row)=>row.centerId===center.id)).map((center)=>rowFromCenter(center,month.key))]);})}>+ 정규 센터</button><button className={styles.secondaryButton} disabled={month.locked} onClick={()=>updateRows([...month.rows,emptyRow()])}>+ 기관 추가</button><button className={styles.secondaryButton} disabled={month.locked} onClick={()=>updateRows([...month.rows,section('[새 구분]','etc')])}>+ 구분 추가</button><button className={`${styles.secondaryButton} ${styles.dangerButton}`} disabled={month.locked} onClick={()=>void deleteMonth()}><Trash2 size={14}/>이 달 삭제</button><button className={styles.primaryButton} disabled={month.locked} onClick={()=>void persist()}><Save size={14}/>저장</button></div>
    </div>
    <div className={styles.tableWrap}><table className={styles.grid}>
      <colgroup><col style={{width:'2%'}}/><col style={{width:'15%'}}/><col style={{width:'7.5%'}}/><col style={{width:'5%'}}/><col style={{width:'8.5%'}}/><col style={{width:'5%'}}/><col style={{width:'6.5%'}}/><col style={{width:'10%'}}/><col style={{width:'9%'}}/><col style={{width:'10%'}}/><col style={{width:'12.5%'}}/><col style={{width:'9%'}}/></colgroup>
      <thead><tr><th aria-label="순서"></th><th>기관명</th><th className={styles.numeric}>수업료</th><th className={styles.numeric}>회기</th><th className={styles.numeric}>총액</th><th>계산서</th><th>영수</th><th className={styles.numeric}>부가세</th><th className={styles.numeric}>경비(인건비)</th><th className={styles.numeric}>세액 제외</th><th>비고</th><th aria-label="행 작업"></th></tr></thead>
      <tbody>{visible.map((row)=>{
        if(row.kind==='section') return <tr key={row.id} className={styles.sectionRow}><td colSpan={12}><div className={styles.sectionContent}><span aria-hidden="true">▸</span><input disabled={month.locked} value={row.name} aria-label="구분명" onChange={(event)=>updateRow(row.id,{name:event.target.value})}/><button className={styles.sectionDelete} aria-label={`${row.name} 삭제`} disabled={month.locked} onClick={()=>updateRows(month.rows.filter((item)=>item.id!==row.id))}><Trash2 size={14}/></button></div></td></tr>;
        const value=calculateRow(row,settings);
        const move=(direction:-1|1)=>{const index=month.rows.indexOf(row);const target=index+direction;if(target<0||target>=month.rows.length)return;const next=[...month.rows];[next[target],next[index]]=[next[index],next[target]];updateRows(next);};
        return <tr key={row.id}>
          <td><div className={styles.actions} aria-hidden="true">⋮⋮</div></td>
          <td data-label="기관명"><input disabled={month.locked} onFocus={() => void loadPolicies()} list="settlement-centers" className={styles.centerInput} value={row.name} aria-label="기관명" onChange={(e)=>updateRow(row.id,{name:e.target.value})} onBlur={(e)=>void applyPolicyByName(month.key,row.id,e.currentTarget.value)}/></td>
          <td data-label="수업료"><MoneyInput disabled={month.locked} className={styles.numericInput} value={row.fee} aria-label={`${row.name} 수업료`} onChange={(e)=>updateRow(row.id,{fee:e.target.value})}/></td>
          <td data-label="회기"><input disabled={month.locked} className={styles.numericInput} value={row.sessions} inputMode="numeric" aria-label={`${row.name} 회기`} onChange={(e)=>updateRow(row.id,{sessions:e.target.value})}/></td>
          <td data-label="총액"><MoneyInput disabled={month.locked} className={`${styles.numericInput} ${styles.totalInput}`} placeholder={Math.round(value.total).toLocaleString('ko-KR')} value={row.total} aria-label={`${row.name} 총액`} title="비워 두면 수업료×회기" onChange={(e)=>updateRow(row.id,{total:e.target.value})}/></td>
          <td data-label="계산서" className={styles.statusCell}><button title={row.invDate||'계산서 발행'} aria-label={`${row.name} 계산서 발행`} aria-pressed={row.inv} disabled={month.locked} className={`${styles.statusButton} ${row.inv?styles.statusButtonOn:''}`} onClick={()=>updateRow(row.id,{inv:!row.inv,invDate:!row.inv?new Date().toISOString().slice(0,10):''})}>✓</button><span className={styles.cellMeta}>{row.invDate?.slice(5)}</span></td>
          <td data-label="영수" className={styles.statusCell}><button title={row.rcptDate||row.dueDate||'영수'} aria-label={`${row.name} 영수`} aria-pressed={row.rcpt} disabled={month.locked} className={`${styles.statusButton} ${row.rcpt?styles.statusButtonOn:row.rcptAmt?styles.statusButtonPending:''}`} onClick={()=>updateRow(row.id,{rcpt:!row.rcpt,rcptDate:!row.rcpt?new Date().toISOString().slice(0,10):''})}>✓</button>{!row.rcpt&&value.total>0&&<MoneyInput showSuffix={false} disabled={month.locked} className={styles.partialInput} placeholder="일부 입금" value={row.rcptAmt??''} aria-label={`${row.name} 일부 입금액`} onChange={(e)=>updateRow(row.id,{rcptAmt:e.target.value?Number(e.target.value):null})}/>}<span className={styles.cellMeta}>{row.rcpt?row.rcptDate?.slice(5):row.dueDate?`~${row.dueDate.slice(5)}`:''}</span></td>
          <td data-label="부가세"><div className={styles.vatCell}><select disabled={month.locked} value={row.vatMode} aria-label={`${row.name} 부가세 방식`} onChange={(e)=>updateRow(row.id,{vatMode:e.target.value as SettlementRow['vatMode']})}><option value="auto">자동</option><option value="none">없음</option><option value="manual">직접</option></select>{row.vatMode==='manual'?<MoneyInput disabled={month.locked} className={styles.numericInput} value={row.vatManual} aria-label={`${row.name} 부가세`} onChange={(e)=>updateRow(row.id,{vatManual:Number(e.target.value)})}/>:<span className={styles.vatValue}>{row.vatMode==='none'?'–':money(value.vat)}</span>}</div>{row.whRate>0&&<span className={styles.cellMeta}>원천 -{money(value.withholding)}</span>}</td>
          <td data-label="경비(인건비)"><MoneyInput disabled={month.locked} className={styles.numericInput} value={row.cost} aria-label={`${row.name} 경비`} onChange={(e)=>updateRow(row.id,{cost:e.target.value})}/></td>
          <td data-label="세액 제외"><span className={styles.netValue}>{money(value.netAfterWh)}</span><details className={styles.adjustDetails} open={row.adj!==0||undefined}><summary>{row.adj!==0?`조정 ${row.adj>0?'+':''}${money(row.adj)}`:'조정'}</summary><MoneyInput disabled={month.locked} className={styles.adjustInput} placeholder="± 금액" value={row.adj||''} aria-label={`${row.name} 세액 제외 조정액`} onChange={(e)=>updateRow(row.id,{adj:Number(e.target.value)||0})}/></details></td>
          <td data-label="비고"><input disabled={month.locked} value={row.note} aria-label={`${row.name} 비고`} onChange={(e)=>updateRow(row.id,{note:e.target.value})}/></td>
          <td data-label="행 작업"><div className={styles.actions}><button className={styles.actionButton} disabled={month.locked} title="위로 이동" aria-label={`${row.name} 위로 이동`} onClick={()=>move(-1)}>↑</button><button className={styles.actionButton} disabled={month.locked} title="아래로 이동" aria-label={`${row.name} 아래로 이동`} onClick={()=>move(1)}>↓</button><button className={styles.actionButton} disabled={month.locked} title="행 복제" aria-label={`${row.name} 복제`} onClick={()=>{const index=month.rows.indexOf(row);const next=[...month.rows];next.splice(index+1,0,{...clone(row),id:uid(),inv:false,rcpt:false,invDate:'',rcptDate:''});updateRows(next);}}>⧉</button><button className={`${styles.actionButton} ${styles.deleteButton}`} disabled={month.locked} title="행 삭제" aria-label={`${row.name} 삭제`} onClick={()=>updateRows(month.rows.filter((item)=>item.id!==row.id))}><Trash2 size={13}/></button></div></td>
        </tr>})}</tbody>
    </table></div>
    <datalist id="settlement-centers">{centers.map((center)=><option key={center.id} value={center.name}/>)}</datalist>
  </div>;
}

function YearView({ data, selectMonth }:{data:SettlementSheetData;selectMonth:(key:string)=>void}) {
  const [year,setYear]=useState(data.settings.year);
  const [tab,setTab]=useState<'overview'|'unpaid'|'centers'>('overview');
  const months=sortedMonths(data).filter((month)=>month.key.startsWith(`${year}-`));
  const values=months.map((month)=>({month,summary:summarize(month.rows,data.settings)}));
  const total=values.reduce((sum,item)=>sum+item.summary.total,0); const net=values.reduce((sum,item)=>sum+item.summary.netAfterWh,0); const unpaid=values.reduce((sum,item)=>sum+item.summary.unpaidAmount,0);
  const unpaidRows=months.flatMap((month)=>month.rows.filter((row)=>row.kind==='row').map((row)=>({month,row,value:calculateRow(row,data.settings)}))).filter((item)=>item.value.outstanding>0).sort((a,b)=>(a.row.dueDate||a.month.key).localeCompare(b.row.dueDate||b.month.key));
  const centerRows=[...new Set(months.flatMap((month)=>month.rows.filter((row)=>row.kind==='row').map((row)=>row.name)).filter(Boolean))].map((name)=>{
    const rows=months.flatMap((month)=>month.rows.filter((row)=>row.kind==='row'&&row.name===name));
    const totals=rows.map((row)=>calculateRow(row,data.settings));
    return {name,count:rows.length,total:totals.reduce((sum,value)=>sum+value.total,0),cost:totals.reduce((sum,value)=>sum+value.cost,0),net:totals.reduce((sum,value)=>sum+value.netAfterWh,0)};
  }).sort((a,b)=>b.total-a.total);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2"><select className="h-10 rounded-xl border bg-white px-3" value={year} onChange={(e)=>setYear(Number(e.target.value))}>{[...new Set(sortedMonths(data).map((month)=>Number(month.key.slice(0,4))).concat(new Date().getFullYear()))].sort().map((value)=><option key={value}>{value}</option>)}</select><div className="flex rounded-xl border bg-white p-1">{([['overview','개요'],['unpaid','미수금'],['centers','기관별']] as const).map(([key,label])=><button key={key} onClick={()=>setTab(key)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab===key?'bg-slate-900 text-white':'text-slate-500'}`}>{label}</button>)}</div></div>
    <div className="grid gap-3 md:grid-cols-3">{[['연간 총액',total],['연간 세액 제외',net],['연간 미수금',unpaid]].map(([label,value])=><div key={String(label)} className="rounded-2xl border bg-white p-6"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{money(Number(value))}</p></div>)}</div>
    {tab==='overview'?<div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">월</th><th className="p-3 text-right">총액</th><th className="p-3 text-right">세액 제외</th><th className="p-3 text-right">입금</th><th className="p-3 text-right">미수금</th></tr></thead><tbody>{values.map(({month,summary})=><tr key={month.key} onClick={()=>selectMonth(month.key)} className="cursor-pointer border-t hover:bg-indigo-50"><td className="p-3 font-semibold">{Number(month.key.slice(5))}월 {month.locked?'🔒':''}</td><td className="p-3 text-right">{money(summary.total)}</td><td className="p-3 text-right">{money(summary.netAfterWh)}</td><td className="p-3 text-right">{money(summary.received)}</td><td className="p-3 text-right text-amber-700">{money(summary.unpaidAmount)}</td></tr>)}</tbody></table></div>
      :tab==='unpaid'?<div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">월</th><th className="p-3 text-left">기관</th><th className="p-3 text-right">미수액</th><th className="p-3 text-left">입금예정</th><th className="p-3 text-left">계산서</th></tr></thead><tbody>{unpaidRows.map(({month,row,value})=><tr key={`${month.key}-${row.id}`} onClick={()=>selectMonth(month.key)} className="cursor-pointer border-t hover:bg-amber-50"><td className="p-3">{Number(month.key.slice(5))}월</td><td className="p-3 font-semibold">{row.name}</td><td className="p-3 text-right text-amber-700">{money(value.outstanding)}</td><td className="p-3">{row.dueDate||'-'}</td><td className="p-3">{row.inv?'발행':'미발행'}</td></tr>)}</tbody></table></div>
        :<div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">기관</th><th className="p-3 text-right">출현 월</th><th className="p-3 text-right">연간 총액</th><th className="p-3 text-right">연간 경비</th><th className="p-3 text-right">세액 제외</th><th className="p-3 text-right">비중</th></tr></thead><tbody>{centerRows.map((row)=><tr key={row.name} className="border-t"><td className="p-3 font-semibold">{row.name}</td><td className="p-3 text-right">{row.count}</td><td className="p-3 text-right">{money(row.total)}</td><td className="p-3 text-right">{money(row.cost)}</td><td className="p-3 text-right">{money(row.net)}</td><td className="p-3 text-right">{total?`${(row.total/total*100).toFixed(1)}%`:'-'}</td></tr>)}</tbody></table></div>}
  </div>;
}

function CentersView({centers,tab,setTab,save,remove,add,fromCurrent,fromAll,syncMonths}:{centers:SettlementCenter[];tab:'center'|'private';setTab:(tab:'center'|'private')=>void;save:(center:SettlementCenter)=>Promise<void>;remove:(center:SettlementCenter)=>Promise<void>;add:()=>void;fromCurrent:()=>void;fromAll:()=>void;syncMonths:()=>void}) {
  const privateMode=tab==='private';
  const shown=centers.filter((center)=>privateMode?center.type==='private':center.type!=='private');
  const [, refreshDraft] = useState(0);
  const patch=(center:SettlementCenter,key:keyof SettlementCenter,value:unknown)=>{ Object.assign(center,{[key]:value}); refreshDraft((version)=>version+1); };
  const actions=(center:SettlementCenter)=><div className="flex items-center justify-end gap-2 whitespace-nowrap"><button className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100" onClick={()=>{const from=prompt('요율 적용 시작 월 (YYYY-MM)',new Date().toISOString().slice(0,7));if(!from)return;center.rates=[...(center.rates||[]),{id:uid(),from,instr:center.instr,assist:center.assist,rental:center.rental,cost:center.cost}];void save({...center});}} title={`요율 이력 ${(center.rates||[]).length}건`}>이력</button><button className="rounded-md p-1.5 text-emerald-700 hover:bg-emerald-50" onClick={()=>void save({...center})} title="저장" aria-label={`${center.name} 저장`}><Save size={15}/></button><button className="rounded-md p-1.5 text-red-500 hover:bg-red-50" onClick={()=>void remove(center)} title="삭제" aria-label={`${center.name} 삭제`}><Trash2 size={15}/></button></div>;
  const operationalFields=(center:SettlementCenter)=><>
    <td className="p-1"><input className={fieldClass} defaultValue={center.sessions} inputMode="numeric" aria-label="기본 회기" onChange={(e)=>patch(center,'sessions',e.target.value)}/></td>
    <td className="p-1"><select className={fieldClass} defaultValue={center.vat} aria-label="부가세" onChange={(e)=>patch(center,'vat',e.target.value)}><option value="auto">자동</option><option value="none">없음</option></select></td>
  </>;
  const managementFields=(center:SettlementCenter)=><>
    <td className="p-1"><div className="flex gap-1"><select className={fieldClass} defaultValue={center.termType} aria-label="결제 조건" onChange={(e)=>patch(center,'termType',e.target.value)}><option value="end">월말</option><option value="day">익월 일자</option><option value="days">며칠 후</option></select><input className={fieldClass} type="number" defaultValue={center.termValue} aria-label="결제일 값" onChange={(e)=>patch(center,'termValue',Number(e.target.value))}/></div></td>
    <td className="p-1"><select className={fieldClass} defaultValue={center.status} aria-label="상태" onChange={(e)=>patch(center,'status',e.target.value)}><option value="active">진행</option><option value="ended">종료</option></select></td>
    <td className="p-1"><input className={fieldClass} defaultValue={center.note} aria-label="비고" onChange={(e)=>patch(center,'note',e.target.value)}/></td>
    <td className="p-1">{actions(center)}</td>
  </>;
  return <div className="space-y-4">
    <div className="flex flex-wrap justify-between gap-2"><div className="flex rounded-xl border bg-white p-1"><button className={`rounded-lg px-4 py-2 text-sm ${tab==='center'?'bg-slate-900 text-white':''}`} onClick={()=>setTab('center')}>센터</button><button className={`rounded-lg px-4 py-2 text-sm ${tab==='private'?'bg-slate-900 text-white':''}`} onClick={()=>setTab('private')}>개인수업</button></div><div className="flex flex-wrap gap-2"><button className={secondaryButton} onClick={fromCurrent}>현재 달에서</button><button className={secondaryButton} onClick={fromAll}>월 전체에서</button><button className={secondaryButton} onClick={syncMonths}>미확정 월 반영</button><button className={primaryButton} onClick={add}><Plus size={15}/>{privateMode?'개인수업':'센터'} 추가</button></div></div>
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className={`${styles.policyTable} w-full text-xs ${privateMode?'min-w-[960px]':'min-w-[1180px]'}`}>
      <thead className="bg-slate-50 text-slate-600"><tr>{(privateMode?['이름 · 수업명','수업료','인건비','기본 회기','부가세','원천징수','결제조건','상태','비고','']:['기관명','구분','강사료','보조','대여','수업료 합계','인건비','기본 회기','부가세','원천징수','결제조건','상태','비고','']).map((label)=><th key={label||'actions'} className="whitespace-nowrap p-2 text-left">{label}</th>)}</tr></thead>
      <tbody>{shown.map((center)=>privateMode
        ? <tr key={center.id} className="border-t"><td className="p-1"><input className={fieldClass} defaultValue={center.name} aria-label="이름 또는 수업명" onChange={(e)=>patch(center,'name',e.target.value)}/></td><td className="p-1"><MoneyInput className={fieldClass} defaultValue={center.fee} aria-label="수업료" onChange={(e)=>patch(center,'fee',e.target.value)}/></td><td className="p-1"><MoneyInput className={fieldClass} defaultValue={center.cost} aria-label="인건비" onChange={(e)=>patch(center,'cost',e.target.value)}/></td>{operationalFields(center)}<td className="p-1"><input className={fieldClass} type="number" defaultValue={center.whRate} aria-label="원천징수율" onChange={(e)=>patch(center,'whRate',Number(e.target.value))}/></td>{managementFields(center)}</tr>
        : <tr key={center.id} className="border-t"><td className="p-1"><input className={fieldClass} defaultValue={center.name} aria-label="기관명" onChange={(e)=>patch(center,'name',e.target.value)}/><SettlementCenterLink centerId={center.center_id} onSelect={async (center_id)=>{await save({...center,center_id});}}/></td><td className="p-1"><select className={fieldClass} defaultValue={center.type} aria-label="구분" onChange={(e)=>patch(center,'type',e.target.value)}><option value="regular">정규</option><option value="short">단기</option><option value="private">개인</option><option value="etc">기타</option></select></td>{(['instr','assist','rental'] as const).map((key)=><td key={key} className="p-1"><MoneyInput className={fieldClass} defaultValue={center[key]} aria-label={key==='instr'?'강사료':key==='assist'?'보조강사료':'대여비'} onChange={(e)=>patch(center,key,e.target.value)}/></td>)}<td className="whitespace-nowrap p-2 text-right font-bold tabular-nums" title={formatMoneyExpression(centerFee(center))}>{formatSettlementAmount(centerFee(center), center.sessions)}</td><td className="p-1"><MoneyInput className={fieldClass} defaultValue={center.cost} aria-label="인건비" onChange={(e)=>patch(center,'cost',e.target.value)}/></td>{operationalFields(center)}<td className="p-1"><input className={fieldClass} type="number" defaultValue={center.whRate} aria-label="원천징수율" onChange={(e)=>patch(center,'whRate',Number(e.target.value))}/></td>{managementFields(center)}</tr>)}</tbody>
    </table></div>
  </div>;
}
