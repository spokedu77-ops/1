'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, FileDown, Lock, MoreHorizontal, Plus, Redo2, Save, Trash2, Undo2, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import SettlementCenterImport from './SettlementCenterImport';
import SettlementPrivateImport from './SettlementPrivateImport';
import SettlementProfitSummary from './SettlementProfitSummary';
import SettlementCalculationSettings from './SettlementCalculationSettings';
import MoneyInput from './SettlementMoneyInput';
import SettlementNote from './SettlementNote';
import { loadXlsx } from './settlementXlsx';
import styles from './SettlementSheet.module.css';
import {
  calculateRow, sortSettlementRows, SETTLEMENT_GROUPS, rowsFromRecurringCenters, nextSettlementMonthKey, emptyRow, resolveDefaultSettlementMonth, rowFromCenter, summarize,
  type CenterType, type SettlementCenter, type SettlementMonth, type SettlementRow,
  type SettlementSettings, type SettlementSheetData,
} from './settlementSheetCore';

type View = 'month' | 'year';
const EMPTY_DATA: SettlementSheetData = { months: {}, centers: {}, settings: { vatMethod: 'sheet', year: new Date().getFullYear() } };
const money = (value: number) => `${Math.round(value || 0).toLocaleString('ko-KR')}원`;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const sortedMonths = (data: SettlementSheetData) => Object.values(data.months).sort((a, b) => a.key.localeCompare(b.key));


export default function SettlementSheet() {
  const [data, setData] = useState<SettlementSheetData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [creatingMonth, setCreatingMonth] = useState(false);
  const creatingMonthRef = useRef(false);
  const [view, setView] = useState<View>('month');
  const [currentKey, setCurrentKey] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'wait' | 'invoice' | 'unpaid'>('all');
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
      const request = policiesRequest.current ?? fetch('/api/admin/settlement-sheet?scope=private', { cache: 'no-store' }).then(async (response) => {
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
    if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || '설정을 저장하지 못했습니다.'); }
    setData((state) => ({ ...state, settings })); toast.success('설정을 저장했습니다.');
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
    const policy = Object.values(loaded).find((item) => item.type === 'private' && item.name.trim() === name.trim());
    if (!policy) return;
    // Preserve the existing policy-name convenience without linking an operational center by name.
    const replacement = { ...rowFromCenter(policy, monthKey), id: row.id, name: row.name,
      total: row.total, inv: row.inv, rcpt: row.rcpt, rcptAmt: row.rcptAmt,
      invDate: row.invDate, rcptDate: row.rcptDate, note: row.note };
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
    if (creatingMonthRef.current || loading) return;
    creatingMonthRef.current = true;
    setCreatingMonth(true);
    const key = nextSettlementMonthKey(Object.keys(data.months));
    try {
      const response = await fetch('/api/admin/settlement-centers?scope=recurring', { cache: 'no-store' });
      if (!response.ok) throw new Error('정기 센터 정보를 불러오지 못했습니다.');
      const result = await response.json() as { centers: Parameters<typeof rowsFromRecurringCenters>[0] };
      const regularRows = rowsFromRecurringCenters(result.centers, key);
      const rows = SETTLEMENT_GROUPS.flatMap((group) => [section(group.name, group.type),
        ...(group.type === 'regular' ? regularRows : [])]);
      const month: SettlementMonth = { key, label: `${Number(key.slice(5))}월 수업료`, rows, rev: '', locked: false, lockedAt: null };
      await saveMonth(month, ''); setCurrentKey(key); setView('month'); toast.success('센터 DB의 정기수업으로 새 달을 만들었습니다.');
    }
    catch (error) { toast.error((error as Error).message); }
    finally { creatingMonthRef.current = false; setCreatingMonth(false); }
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
    const response = await fetch('/api/admin/settlement-sheet?scope=backup', { cache: 'no-store' });
    if (!response.ok) { toast.error('백업 정보를 불러오지 못했습니다.'); return; }
    const { centers } = await response.json() as SettlementSheetData;
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
        const rows: unknown[][] = [['기관명','수업료','회기','총액','계산서 발행 여부','영수여부','부가세','강사료(인건비)','정산 순수익','비고','발행일','영수일','영수금액']];
        sortSettlementRows(month.rows).forEach((row) => {
          if (row.kind === 'section') { rows.push([row.name]); return; }
          const value = calculateRow(row, data.settings); rows.push([row.name,row.fee,row.sessions,value.total,row.inv?'O':'',row.rcpt?'O':'',value.vat,row.cost,value.netAfterWh,row.note,row.invDate,row.rcptDate,row.rcptAmt ?? '']);
        });
        xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), month.label.slice(0, 31));
      }
      xlsx.writeFile(workbook, all ? '수업료 정산.xlsx' : `수업료 정산 ${current?.label ?? ''}.xlsx`);
    } catch { toast.error('Excel 파일을 만들지 못했습니다.'); }
  };

  if (loading) return <div className="py-24 text-center text-sm font-bold text-slate-500">정산 시트를 불러오는 중…</div>;
  return <div className={`${styles.sheet} ${styles.settlementSurface} mx-auto w-full max-w-[1400px] px-3 pb-32 pt-5 sm:px-4`}>
    <header className={styles.header}>
      <div className={styles.brand}><span className={styles.mark} aria-hidden="true">₩</span><div><h1 className={styles.heading}>수업료 정산</h1><p className={styles.subheading}>{view === 'month' ? '월별 수업료·인건비 정산' : '연간 대시보드'} · {saveState}</p></div></div>
      <div className={styles.headerActions}>
        <details className={styles.managementMenu}>
          <summary className={styles.secondaryButton}>시트 관리 <MoreHorizontal size={16}/></summary>
          <div className={styles.managementBody}>
            <p className={styles.menuLabel}>내보내기</p>
            <button type="button" disabled={!current} onClick={() => void exportExcel(false)}><FileDown size={14}/>선택한 월 Excel</button>
            <button type="button" onClick={() => void exportExcel(true)}><FileDown size={14}/>전체 월 Excel</button>
            <p className={styles.menuLabel}>백업</p>
            <button type="button" onClick={() => void backup()}><Download size={14}/>백업 다운로드</button>
            <button type="button" onClick={() => restoreRef.current?.click()}>백업 파일 복원</button>
            <SettlementCalculationSettings key={`${data.settings.vatMethod}-${data.settings.year}`} settings={data.settings} hasLockedMonths={Object.values(data.months).some((month) => month.locked)} onSave={saveSettings} />
          </div>
        </details>
      </div>
    </header>
    <input ref={restoreRef} hidden type="file" accept=".json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void restore(file); event.target.value=''; }}/>
    <nav className={styles.monthBar}>
      <div className={styles.monthGroup}>{sortedMonths(data).map((month) => <button key={month.key} onClick={() => { setCurrentKey(month.key); setView('month'); }} className={`${styles.monthTab} ${view==='month'&&currentKey===month.key?styles.monthTabActive:''}`}>{month.key.replace('-', '. ')}월{month.locked?' 🔒':''}</button>)}<button onClick={createMonth} disabled={creatingMonth || loading} className={`${styles.monthTab} ${styles.monthAdd}`}><Plus size={13} className="inline"/> {creatingMonth ? '만드는 중…' : '새 달'}</button></div>
      <div className={styles.monthGroup}><button onClick={() => setView('year')} className={`${styles.monthTab} ${view==='year'?styles.viewTabActive:''}`}>연간 대시보드</button><Link href="/admin/centers?tab=private&view=settlement" className={styles.monthTab}>{'개인 수업 DB'}</Link></div>
    </nav>
    {view === 'month' ? <MonthView key={current?.key ?? 'empty'} applyPolicyByName={applyPolicyByName} loadPolicies={loadPolicies} month={current} settings={data.settings} summary={summary} centers={centers} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} updateRow={updateRow} updateRows={updateRows} persist={persistCurrent} toggleLock={toggleLock} deleteMonth={deleteMonth} undo={undo} redo={redo} canUndo={Boolean(current&&history[current.key]?.length)} canRedo={Boolean(current&&future[current.key]?.length)}/>
      : <YearView data={data} selectMonth={(key) => { setCurrentKey(key); setView('month'); }}/>}
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
  const [addingCenter, setAddingCenter] = useState(false);
  const [addingPrivate, setAddingPrivate] = useState(false);
  if (!month || !summary) return <div className="rounded-2xl border bg-white p-16 text-center"><p className="font-bold">아직 정산 데이터가 없습니다.</p><p className="mt-2 text-sm text-slate-500">새 달을 만들어 정산을 시작하세요.</p></div>;
  const rows = month.rows.filter((row) => row.kind === 'row');
  const waiting = rows.filter((row) => row.fee !== '' && row.sessions === '' && row.total === '' && !calculateRow(row, settings).total).length;
  const visible = sortSettlementRows(month.rows).filter((row) => row.kind === 'section'
    ? filter === 'all' && !query
    : (!query || `${row.name} ${row.note}`.toLowerCase().includes(query.toLowerCase()))
      && (filter==='all'||filter==='wait'&&row.fee!==''&&row.sessions===''&&row.total===''&&!calculateRow(row,settings).total||filter==='invoice'&&!row.inv&&row.vatMode!=='none'||filter==='unpaid'&&calculateRow(row,settings).outstanding>0));
  return <div className="space-y-3">
    <div className={styles.monthHeading}>
      <div><h2>{month.label}</h2><span className={styles.monthStatus}>{month.locked ? '확정 · 읽기 전용' : '미확정 · 변경사항 자동 저장'}</span></div>
      <div className={styles.toolbarActions}>
        <button className={month.locked ? styles.secondaryButton : styles.primaryButton} onClick={toggleLock}>{month.locked ? <Unlock size={14}/> : <Lock size={14}/>} {month.locked ? '확정 해제' : '이 달 확정'}</button>
        <details className={styles.managementMenu}><summary className={styles.secondaryButton}>월 관리 <MoreHorizontal size={15}/></summary><div className={styles.managementBody}>
          <button type="button" disabled={month.locked} onClick={() => void persist()}><Save size={14}/>지금 저장</button>
          <button type="button" disabled={month.locked} onClick={() => void deleteMonth()} className={styles.menuDanger}><Trash2 size={14}/>이 달 삭제</button>
        </div></details>
      </div>
    </div>
    <SettlementProfitSummary summary={summary} />
    {!month.locked ? <section className={styles.entryPanel} aria-label="수업 추가">
      <div className={styles.entryToolbar}><span>수업 추가</span><div className={styles.toolbarActions}>
        <button type="button" aria-expanded={addingCenter} className={addingCenter ? styles.selectedSource : styles.secondaryButton} onClick={() => { setAddingCenter((value) => !value); setAddingPrivate(false); }}><Plus size={14}/>센터 수업</button>
        <button type="button" aria-expanded={addingPrivate} className={addingPrivate ? styles.selectedSource : styles.secondaryButton}
          onClick={() => { setAddingPrivate((value) => !value); setAddingCenter(false); }}><Plus size={14}/>개인 수업</button>
        <button type="button" className={styles.secondaryButton} onClick={() => updateRows([...month.rows, emptyRow()])}>직접 입력</button>
      </div></div>
      {addingCenter ? <SettlementCenterImport key={month.key} monthKey={month.key} disabled={false} expanded
        existingIds={month.rows.flatMap((row) => row.operationalCenterId ? [row.operationalCenterId] : [])}
        onAdd={(row) => { updateRows([...month.rows,row]); setAddingCenter(false); }} /> : null}
      {addingPrivate ? <SettlementPrivateImport month={month} onAdd={(additions) => {
        const next = [...month.rows];
        let groupIndex = next.findIndex((row) => row.kind === 'section' && row.type === 'private');
        if (groupIndex < 0) {
          const etcIndex = next.findIndex((row) => row.kind === 'section' && row.type === 'etc');
          groupIndex = etcIndex < 0 ? next.length : etcIndex;
          next.splice(groupIndex, 0, section(SETTLEMENT_GROUPS.find((group) => group.type === 'private')!.name, 'private'));
        }
        const nextSection = next.findIndex((row, index) => index > groupIndex && row.kind === 'section');
        next.splice(nextSection < 0 ? next.length : nextSection, 0, ...additions);
        updateRows(next); setAddingPrivate(false);
        toast.success(`${additions.length}개 개인수업을 추가했습니다.`);
      }} /> : null}
    </section> : null}
    <section className={styles.editingTools} aria-label="검색·편집">
    <div className={styles.toolbar} aria-label="정산 행 검색">
      <input className={styles.search} type="search" placeholder="기관명·비고 검색" aria-label="기관명·비고 검색" value={query} onChange={(event)=>setQuery(event.target.value)}/>
    </div>
    <div className={styles.filterRow}>
      <button className={`${styles.filterChip} ${filter==='all'?styles.filterChipActive:''}`} onClick={()=>setFilter('all')}>전체 <b>{rows.length}</b></button>
      <button className={`${styles.filterChip} ${filter==='wait'?styles.filterChipActive:''}`} onClick={()=>setFilter(filter==='wait'?'all':'wait')}>회기 입력 대기 <b>{waiting}</b></button>
      <button className={`${styles.filterChip} ${filter==='invoice'?styles.filterChipActive:''}`} onClick={()=>setFilter(filter==='invoice'?'all':'invoice')}>계산서 미발행 <b>{summary.noInvoice}</b></button>
      <button className={`${styles.filterChip} ${filter==='unpaid'?styles.filterChipActive:''}`} onClick={()=>setFilter(filter==='unpaid'?'all':'unpaid')}>미입금 <b>{summary.unpaid}</b>{summary.unpaidAmount>0&&` · ${money(summary.unpaidAmount)}`}</button>
      <span className="flex-1"/><button aria-label="실행 취소" title="실행 취소" disabled={!canUndo||month.locked} onClick={undo} className={styles.historyButton}><Undo2 size={16}/></button><button aria-label="다시 실행" title="다시 실행" disabled={!canRedo||month.locked} onClick={redo} className={styles.historyButton}><Redo2 size={16}/></button>
    </div>
    </section>
    <div className={`${styles.tableWrap} ${styles.settlementTableWrap}`}><table className={`${styles.grid} ${styles.settlementGrid}`}>
      <colgroup><col style={{width:'16%'}}/><col style={{width:'11%'}}/><col style={{width:'4%'}}/><col style={{width:'12%'}}/><col style={{width:'5%'}}/><col style={{width:'6%'}}/><col style={{width:'10%'}}/><col style={{width:'11%'}}/><col style={{width:'12%'}}/><col style={{width:'7%'}}/><col style={{width:'6%'}}/></colgroup>
      <thead><tr><th scope="col">기관명</th><th scope="col" className={styles.numeric}>수업료</th><th scope="col" className={styles.centered}>회기</th><th scope="col" className={styles.numeric}>총액</th><th scope="col" className={styles.centered}>계산서</th><th scope="col" className={styles.centered}>입금</th><th scope="col" className={styles.numeric}>부가세</th><th scope="col" className={styles.numeric}>강사료(인건비)</th><th scope="col" className={styles.numeric}>정산 순수익</th><th scope="col">비고</th><th scope="col" aria-label="행 작업"></th></tr></thead>
      <tbody>{visible.map((row)=>{
        if(row.kind==='section') return <tr key={row.id} className={styles.sectionRow}><th colSpan={11} scope="rowgroup"><div className={styles.sectionContent}><span>{row.name}</span></div></th></tr>;
        const value=calculateRow(row,settings);
        return <tr key={row.id}>
          <td data-label="기관명"><input disabled={month.locked} onFocus={() => void loadPolicies()} list="settlement-centers" className={styles.centerInput} value={row.name} aria-label="기관명" onChange={(e)=>updateRow(row.id,{name:e.target.value})} onBlur={(e)=>void applyPolicyByName(month.key,row.id,e.currentTarget.value)}/></td>
          <td data-label="수업료"><MoneyInput disabled={month.locked} className={styles.numericInput} value={row.fee} aria-label={`${row.name} 수업료`} onChange={(e)=>updateRow(row.id,{fee:e.target.value})}/></td>
          <td data-label="회기"><input disabled={month.locked} className={styles.centered} value={row.sessions} inputMode="numeric" aria-label={`${row.name} 회기`} onChange={(e)=>updateRow(row.id,{sessions:e.target.value})}/></td>
          <td data-label="총액"><MoneyInput disabled={month.locked} className={`${styles.numericInput} ${styles.totalInput}`} placeholder={Math.round(value.total).toLocaleString('ko-KR')} value={row.total} aria-label={`${row.name} 총액`} title="비워 두면 수업료×회기" onChange={(e)=>updateRow(row.id,{total:e.target.value})}/></td>
          <td data-label="계산서" className={styles.statusCell}>{row.vatMode === 'none' ? <span className={styles.invoiceNotApplicable} title="부가세 없음 · 계산서 발행 대상 아님" aria-label={`${row.name} 부가세 없음, 계산서 발행 대상 아님`}>—</span> : <><button title={row.invDate||'계산서 발행'} aria-label={`${row.name} 계산서 발행`} aria-pressed={row.inv} disabled={month.locked} className={`${styles.statusButton} ${row.inv?styles.statusButtonOn:''}`} onClick={()=>updateRow(row.id,{inv:!row.inv,invDate:!row.inv?new Date().toISOString().slice(0,10):''})}>✓</button>{row.inv && row.invDate && <time className={styles.statusDate} dateTime={row.invDate}>{row.invDate.slice(5).replace('-', '.')}</time>}</>}</td>
          <td data-label="입금" className={styles.statusCell}><button title={row.rcptDate||row.dueDate||'영수'} aria-label={`${row.name} 영수`} aria-pressed={row.rcpt} disabled={month.locked} className={`${styles.statusButton} ${row.rcpt?styles.statusButtonOn:row.rcptAmt?styles.statusButtonPending:''}`} onClick={()=>updateRow(row.id,{rcpt:!row.rcpt,rcptDate:!row.rcpt?new Date().toISOString().slice(0,10):''})}>✓</button>{row.rcpt && row.rcptDate && <time className={styles.statusDate} dateTime={row.rcptDate}>{row.rcptDate.slice(5).replace('-', '.')}</time>}</td>
          <td data-label="부가세"><details className={styles.vatDetails}><summary className={styles.profitAmount} aria-label={`${row.name} 부가세 설정`} title={`부가세 설정${row.whRate > 0 ? ` · 원천 -${money(value.withholding)}` : ''}`}>{row.vatMode==='none'?'없음':money(value.vat)}</summary><div className={styles.vatMenu}><select disabled={month.locked} value={row.vatMode} aria-label={`${row.name} 부가세 방식`} onChange={(e)=>updateRow(row.id,{vatMode:e.target.value as SettlementRow['vatMode']})}><option value="auto">자동</option><option value="none">없음</option><option value="manual">직접</option></select>{row.vatMode==='manual'&&<MoneyInput disabled={month.locked} className={styles.numericInput} value={row.vatManual} aria-label={`${row.name} 부가세`} onChange={(e)=>updateRow(row.id,{vatManual:Number(e.target.value)})}/>}</div></details></td>
          <td data-label="강사료(인건비)"><MoneyInput disabled={month.locked} className={styles.numericInput} value={row.cost === '' ? '' : value.cost} aria-label={`${row.name} 강사료(인건비)`} onChange={(e)=>updateRow(row.id,{cost:e.target.value})}/></td>
          <td data-label="정산 순수익"><output className={styles.profitValue} aria-label={`${row.name} 정산 순수익`}>{money(value.netAfterWh)}</output></td>
          <td data-label="비고"><SettlementNote name={row.name} value={row.note} disabled={month.locked} onSave={(note) => updateRow(row.id, { note })}/></td>
          <td data-label="행 작업"><div className={styles.actions}><button className={`${styles.actionButton} ${styles.deleteButton}`} disabled={month.locked} title="행 삭제" aria-label={`${row.name} 삭제`} onClick={()=>updateRows(month.rows.filter((item)=>item.id!==row.id))}><Trash2 size={13}/></button></div></td>
        </tr>})}</tbody>
    </table></div>
    <datalist id="settlement-centers">{centers.filter((center) => center.type === 'private').map((center)=><option key={center.id} value={center.name}/>)}</datalist>
  </div>;
}

function YearView({ data, selectMonth }:{data:SettlementSheetData;selectMonth:(key:string)=>void}) {
  const [year,setYear]=useState(data.settings.year);
  const [tab,setTab]=useState<'overview'|'unpaid'|'centers'>('overview');
  const months=sortedMonths(data).filter((month)=>month.key.startsWith(`${year}-`));
  const values=months.map((month)=>({month,summary:summarize(month.rows,data.settings)}));
  const annual = summarize(months.flatMap((month) => month.rows), data.settings);
  const total = annual.total;
  const unpaidRows=months.flatMap((month)=>month.rows.filter((row)=>row.kind==='row').map((row)=>({month,row,value:calculateRow(row,data.settings)}))).filter((item)=>item.value.outstanding>0).sort((a,b)=>(a.row.dueDate||a.month.key).localeCompare(b.row.dueDate||b.month.key));
  const centerRows=[...new Set(months.flatMap((month)=>month.rows.filter((row)=>row.kind==='row').map((row)=>row.name)).filter(Boolean))].map((name)=>{
    const rows=months.flatMap((month)=>month.rows.filter((row)=>row.kind==='row'&&row.name===name));
    const totals=rows.map((row)=>calculateRow(row,data.settings));
    return {name,count:rows.length,total:totals.reduce((sum,value)=>sum+value.total,0),cost:totals.reduce((sum,value)=>sum+value.cost,0),net:totals.reduce((sum,value)=>sum+value.netAfterWh,0)};
  }).sort((a,b)=>b.total-a.total);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2"><select className="h-10 rounded-xl border bg-white px-3" value={year} onChange={(e)=>setYear(Number(e.target.value))}>{[...new Set(sortedMonths(data).map((month)=>Number(month.key.slice(0,4))).concat(new Date().getFullYear(), data.settings.year))].sort().map((value)=><option key={value}>{value}</option>)}</select><div className="flex rounded-xl border bg-white p-1">{([['overview','개요'],['unpaid','미수금'],['centers','기관별']] as const).map(([key,label])=><button key={key} onClick={()=>setTab(key)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab===key?'bg-slate-900 text-white':'text-slate-500'}`}>{label}</button>)}</div></div>
    <SettlementProfitSummary summary={annual} annual />
    {tab==='overview'?<div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">월</th><th className="p-3 text-right">총액</th><th className="p-3 text-right">정산 순수익</th><th className="p-3 text-right">입금</th><th className="p-3 text-right">미수금</th></tr></thead><tbody>{values.map(({month,summary})=><tr key={month.key} onClick={()=>selectMonth(month.key)} className="cursor-pointer border-t hover:bg-indigo-50"><td className="p-3 font-semibold">{Number(month.key.slice(5))}월 {month.locked?'🔒':''}</td><td className="p-3 text-right">{money(summary.total)}</td><td className="p-3 text-right">{money(summary.netAfterWh)}</td><td className="p-3 text-right">{money(summary.received)}</td><td className="p-3 text-right text-amber-700">{money(summary.unpaidAmount)}</td></tr>)}</tbody></table></div>
      :tab==='unpaid'?<div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">월</th><th className="p-3 text-left">기관</th><th className="p-3 text-right">미수액</th><th className="p-3 text-left">입금예정</th><th className="p-3 text-left">계산서</th></tr></thead><tbody>{unpaidRows.map(({month,row,value})=><tr key={`${month.key}-${row.id}`} onClick={()=>selectMonth(month.key)} className="cursor-pointer border-t hover:bg-amber-50"><td className="p-3">{Number(month.key.slice(5))}월</td><td className="p-3 font-semibold">{row.name}</td><td className="p-3 text-right text-amber-700">{money(value.outstanding)}</td><td className="p-3">{row.dueDate||'-'}</td><td className="p-3">{row.inv?'발행':'미발행'}</td></tr>)}</tbody></table></div>
        :<div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">기관</th><th className="p-3 text-right">출현 월</th><th className="p-3 text-right">연간 총액</th><th className="p-3 text-right">연간 경비</th><th className="p-3 text-right">정산 순수익</th><th className="p-3 text-right">비중</th></tr></thead><tbody>{centerRows.map((row)=><tr key={row.name} className="border-t"><td className="p-3 font-semibold">{row.name}</td><td className="p-3 text-right">{row.count}</td><td className="p-3 text-right">{money(row.total)}</td><td className="p-3 text-right">{money(row.cost)}</td><td className="p-3 text-right">{money(row.net)}</td><td className="p-3 text-right">{total?`${(row.total/total*100).toFixed(1)}%`:'-'}</td></tr>)}</tbody></table></div>}
  </div>;
}
