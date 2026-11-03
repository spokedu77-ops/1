'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Package, Plus, Search, X } from 'lucide-react';
import type { SimpleMove, SimpleRental } from '@/app/lib/equipment/simpleMath';

type Item = { id: number; name: string; image: string | null; category: string | null;
  mgmt_code: string | null; qty_total: number | null; lent: number | null; available: number | null };
type Teacher = { id: string; name: string };
type Snapshot = { items: Item[]; teachers: Teacher[]; rentals: SimpleRental[]; moves: SimpleMove[] };
type Tab = 'stock' | 'teachers' | 'history';
type Editor = { id: number | null; name: string; qty: string; image: string; category: string };
type RentForm = { catalogId: string; teacherId: string; qty: string; date: string; requestKey: string };
type ReturnForm = { rentalId: string; qty: string; date: string; requestKey: string };
const today = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};
const clean = (value: string) => value.trim();
const validQty = (value: string, allowZero = false) =>
  /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && (allowZero ? Number(value) >= 0 : Number(value) > 0);
const emptyEditor = (): Editor => ({ id: null, name: '', qty: '', image: '', category: '' });
const emptyRent = (): RentForm => ({ catalogId: '', teacherId: '', qty: '1', date: today(), requestKey: crypto.randomUUID() });
const emptyReturn = (): ReturnForm => ({ rentalId: '', qty: '1', date: today(), requestKey: crypto.randomUUID() });

function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={title}
      onClick={(e) => e.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="font-bold text-slate-900">{title}</h2>
        <button type="button" aria-label="닫기" onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100"><X size={18}/></button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
    </div>
  </div>;
}
const inputStyle = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500';
const btn = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50';
const primary = 'rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40';

export default function SimpleEquipmentInventory() {
  const [data, setData] = useState<Snapshot>({ items: [], teachers: [], rentals: [], moves: [] });
  const [tab, setTab] = useState<Tab>('stock');
  const [query, setQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'RENT' | 'RETURN'>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [rentForm, setRentForm] = useState<RentForm | null>(null);
  const [returnForm, setReturnForm] = useState<ReturnForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/equipment/simple', { cache: 'no-store' });
    const json = await res.json() as Snapshot & { error?: string };
    if (!res.ok) throw new Error(json.error ?? '교구 데이터를 불러오지 못했습니다.');
    setData({ items: json.items ?? [], teachers: json.teachers ?? [],
      rentals: json.rentals ?? [], moves: json.moves ?? [] });
    setError('');
  }, []);
  useEffect(() => {
    let mounted = true;
    void refresh().catch((e) => { if (mounted) setError(e instanceof Error ? e.message : '조회 오류'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [refresh]);

  const send = async (body: Record<string, unknown>) => {
    if (busy) return false;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/equipment/simple', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) throw new Error(json.error ?? '저장에 실패했습니다.');
      try { await refresh(); } catch { setError('저장은 완료되었지만 최신 데이터 조회에 실패했습니다. 다시 조회하세요.'); }
      toast.success('저장되었습니다.');
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '처리 실패');
      return false;
    } finally { setBusy(false); }
  };

  const stockItems = useMemo(() => data.items.filter((item) =>
    !query || [item.name, item.mgmt_code ?? '', item.category ?? '']
      .some((v) => v.toLowerCase().includes(query.toLowerCase()))), [data.items, query]);
  const activeRentals = data.rentals.filter((r) => r.remaining > 0);
  const itemName = (id: number) => data.items.find((x) => x.id === id)?.name ?? '교구';
  const teacherName = (id: string) => data.teachers.find((x) => x.id === id)?.name ?? '강사';
  const openEdit = (item?: Item) => setEditor(item
    ? { id: item.id, name: item.name, qty: item.qty_total === null ? '' : String(item.qty_total),
      image: item.image ?? '', category: item.category ?? '' } : emptyEditor());
  const openRent = (item?: Item) => setRentForm({ ...emptyRent(), catalogId: item ? String(item.id) : '' });
  const openReturn = (rental?: SimpleRental) => {
    const first = rental ?? activeRentals[0];
    setReturnForm({ ...emptyReturn(), rentalId: first?.id ?? '' });
  };
  const selectedRent = activeRentals.find((r) => r.id === returnForm?.rentalId);
  const selectedItem = data.items.find((i) => String(i.id) === rentForm?.catalogId);
  const displayedMoves = data.moves.filter((m) => historyFilter === 'all' || m.kind === historyFilter)
    .slice().sort((a, b) => b.created_at.localeCompare(a.created_at));

  if (loading) return <p className="p-8 text-sm text-slate-500">교구 수불 데이터를 불러오는 중입니다.</p>;
  return <section className="mx-auto w-full max-w-7xl space-y-4 p-4 text-slate-900 md:p-7">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="flex items-center gap-2 text-xl font-bold"><Package size={23} className="text-blue-600"/>교구 수불관리</h1>
        <p className="mt-1 text-xs text-slate-500">교구 등록 · 강사 대여 · 반납</p></div>
      <div className="flex gap-2">
        <button type="button" className={btn} onClick={() => openRent()}><Plus size={15} className="mr-1 inline"/>대여 등록</button>
        <button type="button" className={primary} onClick={() => openEdit()}><Plus size={15} className="mr-1 inline"/>교구 등록</button>
      </div>
    </header>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" className="ml-2 underline" onClick={() => void refresh().catch(e => setError(String(e)))}>다시 조회</button></div>}
    <nav className="flex gap-5 overflow-x-auto border-b text-sm">
      {([['stock', '교구 재고'], ['teachers', '강사 목록'], ['history', '대여·반납 이력']] as const).map(([id, name]) =>
        <button key={id} type="button" onClick={() => setTab(id)}
          className={`whitespace-nowrap border-b-2 px-1 py-3 font-semibold ${tab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>{name}</button>)}
    </nav>
    {tab === 'stock' && <>
      <label className="flex max-w-sm items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
        <Search size={16} className="text-slate-400"/>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="교구명 검색" className="w-full py-2.5 text-sm outline-none"/>
      </label>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[650px] text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr>
            <th className="p-3 text-left">교구</th><th className="p-3 text-right">총보유</th>
            <th className="p-3 text-right">대여중</th><th className="p-3 text-right">가용</th>
            <th className="p-3 text-center">관리</th></tr></thead>
          <tbody>{stockItems.map((item) => <tr key={item.id} className="border-t border-slate-100">
            <td className="p-3"><div className="flex items-center gap-2">
              {item.image ? <img src={item.image} alt="" className="h-9 w-9 rounded-md object-cover"/> :
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100"><Package size={16}/></div>}
              <div><div className="font-semibold">{item.name}</div><div className="text-[11px] text-slate-400">{item.mgmt_code ?? `PE-${String(item.id).padStart(3, '0')}`}</div></div>
            </div></td>
            <td className="p-3 text-right tabular-nums">{item.qty_total ?? '미입력'}</td>
            <td className="p-3 text-right tabular-nums">{item.lent ?? '—'}</td>
            <td className="p-3 text-right font-bold tabular-nums text-blue-600">{item.available ?? '—'}</td>
            <td className="p-3 text-center"><div className="flex justify-center gap-2">
              {item.qty_total !== null && <>
                <button type="button" disabled={(item.available ?? 0) <= 0} onClick={() => openRent(item)} className="text-xs font-semibold text-blue-700 disabled:opacity-30">대여</button>
                <button type="button" disabled={!activeRentals.some((r) => r.catalog_id === item.id)}
                  onClick={() => openReturn(activeRentals.find((r) => r.catalog_id === item.id))}
                  className="text-xs font-semibold text-blue-700 disabled:opacity-30">반납</button>
              </>}
              <button type="button" onClick={() => openEdit(item)} className="text-xs font-semibold text-slate-600">{item.qty_total === null ? '수량 입력' : '수정'}</button>
            </div></td></tr>)}
            {stockItems.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">교구가 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </>}
    {tab === 'teachers' && <div className="grid gap-3 md:grid-cols-3">
      <div className="grid content-start gap-2">{data.teachers.map((teacher) => {
        const rows = activeRentals.filter((r) => r.teacher_id === teacher.id);
        const qty = rows.reduce((n, r) => n + r.remaining, 0);
        return <button key={teacher.id} type="button" onClick={() => setSelectedTeacher(teacher.id)}
          className={`rounded-xl border p-4 text-left ${selectedTeacher === teacher.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
          <div className="font-semibold">{teacher.name}</div>
          <div className="mt-1 text-xs text-slate-500">{new Set(rows.map((r) => r.catalog_id)).size}종 · {qty}개 대여 중</div>
        </button>;
      })}</div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
        <h2 className="mb-3 font-bold">{selectedTeacher ? `${teacherName(selectedTeacher)} 선생님 보유 교구` : '강사를 선택하세요'}</h2>
        {selectedTeacher && activeRentals.filter((r) => r.teacher_id === selectedTeacher).map((r) =>
          <div key={r.id} className="flex items-center justify-between gap-3 border-t py-3 text-sm">
            <span>{itemName(r.catalog_id)} <span className="text-slate-500">{r.remaining}개 · {r.move_date}</span></span>
            <button type="button" className={btn} onClick={() => openReturn(r)}>반납</button>
          </div>)}
        {selectedTeacher && !activeRentals.some((r) => r.teacher_id === selectedTeacher) &&
          <p className="text-sm text-slate-500">현재 대여 중인 교구가 없습니다.</p>}
      </div>
    </div>}
    {tab === 'history' && <>
      <select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value as typeof historyFilter)} className={inputStyle + ' max-w-xs'}>
        <option value="all">전체 이력</option><option value="RENT">대여</option><option value="RETURN">반납</option>
      </select>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-sm"><thead className="bg-slate-50">
          <tr><th className="p-3 text-left">일자</th><th className="p-3 text-left">작업</th>
            <th className="p-3 text-left">교구</th><th className="p-3 text-left">강사</th>
            <th className="p-3 text-right">수량</th><th className="p-3 text-center">관리</th></tr></thead>
          <tbody>{displayedMoves.map((m) => {
            const rental = activeRentals.find((r) => r.id === m.id);
            return <tr key={m.id} className="border-t">
              <td className="p-3">{m.move_date}</td><td className="p-3">{m.kind === 'RENT' ? '대여' : '반납'}</td>
              <td className="p-3">{itemName(m.catalog_id)}</td><td className="p-3">{teacherName(m.teacher_id)}</td>
              <td className="p-3 text-right">{m.qty}</td><td className="p-3 text-center">
                {rental && <button type="button" onClick={() => openReturn(rental)} className="font-semibold text-blue-600">반납</button>}
              </td></tr>;
          })}
            {displayedMoves.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">거래 이력이 없습니다.</td></tr>}
          </tbody></table>
      </div>
    </>}
    {editor && <Dialog title={editor.id ? '교구·수량 수정' : '교구 등록'} onClose={() => setEditor(null)}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!validQty(editor.qty, true)) return;
        void send({ action: 'save', catalog_id: editor.id, name: clean(editor.name),
          qty_total: Number(editor.qty), image: clean(editor.image) || null,
          category: clean(editor.category) || null }).then((ok) => { if (ok) setEditor(null); }); }}>
        <label className="block text-xs font-semibold">교구명<input required value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} className={inputStyle + ' mt-1'}/></label>
        <label className="block text-xs font-semibold">총보유 수량<input required type="number" min={0} step={1} value={editor.qty}
          onChange={(e) => setEditor({ ...editor, qty: e.target.value })} className={inputStyle + ' mt-1'}/></label>
        <label className="block text-xs font-semibold">카테고리 (선택)<input value={editor.category}
          onChange={(e) => setEditor({ ...editor, category: e.target.value })} className={inputStyle + ' mt-1'}/></label>
        <label className="block text-xs font-semibold">사진 URL (선택)<input value={editor.image}
          onChange={(e) => setEditor({ ...editor, image: e.target.value })} className={inputStyle + ' mt-1'}/></label>
        <button type="submit" disabled={busy || !clean(editor.name) || !validQty(editor.qty, true)}
          className={primary + ' w-full'}>저장</button>
      </form>
    </Dialog>}
    {rentForm && <Dialog title="대여 등록" onClose={() => setRentForm(null)}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault();
        if (!rentForm.catalogId || !rentForm.teacherId || !validQty(rentForm.qty)) return;
        void send({ action: 'rent', catalog_id: Number(rentForm.catalogId),
          teacher_id: rentForm.teacherId, qty: Number(rentForm.qty),
          move_date: rentForm.date, request_key: rentForm.requestKey }).then((ok) => { if (ok) setRentForm(null); }); }}>
        <label className="block text-xs font-semibold">강사<select required value={rentForm.teacherId}
          onChange={(e) => setRentForm({ ...rentForm, teacherId: e.target.value, requestKey: crypto.randomUUID() })} className={inputStyle + ' mt-1'}>
          <option value="">강사 선택</option>{data.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="block text-xs font-semibold">교구<select required value={rentForm.catalogId}
          onChange={(e) => setRentForm({ ...rentForm, catalogId: e.target.value, qty: '1', requestKey: crypto.randomUUID() })} className={inputStyle + ' mt-1'}>
          <option value="">교구 선택</option>{data.items.filter((i) => (i.available ?? 0) > 0).map((i) =>
            <option key={i.id} value={i.id}>{i.name} (가용 {i.available}개)</option>)}</select></label>
        <label className="block text-xs font-semibold">대여 수량 (가용 {selectedItem?.available ?? 0}개)
          <input required type="number" min={1} max={selectedItem?.available ?? 0} step={1} value={rentForm.qty}
            onChange={(e) => setRentForm({ ...rentForm, qty: e.target.value, requestKey: crypto.randomUUID() })} className={inputStyle + ' mt-1'}/></label>
        <label className="block text-xs font-semibold">대여일<input required type="date" value={rentForm.date}
          onChange={(e) => setRentForm({ ...rentForm, date: e.target.value, requestKey: crypto.randomUUID() })} className={inputStyle + ' mt-1'}/></label>
        <button type="submit" disabled={busy || !selectedItem || (selectedItem.available ?? 0) < Number(rentForm.qty) ||
          !rentForm.teacherId || !validQty(rentForm.qty) || !rentForm.date}
          className={primary + ' w-full'}>대여 등록</button>
      </form>
    </Dialog>}
    {returnForm && <Dialog title="교구 반납" onClose={() => setReturnForm(null)}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!selectedRent || !validQty(returnForm.qty)) return;
        void send({ action: 'return', rent_id: selectedRent.id, qty: Number(returnForm.qty),
          move_date: returnForm.date, request_key: returnForm.requestKey }).then((ok) => { if (ok) setReturnForm(null); }); }}>
        <label className="block text-xs font-semibold">대여 건<select required value={returnForm.rentalId}
          onChange={(e) => setReturnForm({ ...returnForm, rentalId: e.target.value, qty: '1', requestKey: crypto.randomUUID() })} className={inputStyle + ' mt-1'}>
          <option value="">대여 건 선택</option>{activeRentals.map((r) =>
            <option key={r.id} value={r.id}>{teacherName(r.teacher_id)} · {itemName(r.catalog_id)} · 잔여 {r.remaining}개 ({r.move_date})</option>)}</select></label>
        <label className="block text-xs font-semibold">반납 수량 (잔여 {selectedRent?.remaining ?? 0}개)
          <input required type="number" min={1} max={selectedRent?.remaining ?? 0} step={1} value={returnForm.qty}
            onChange={(e) => setReturnForm({ ...returnForm, qty: e.target.value, requestKey: crypto.randomUUID() })} className={inputStyle + ' mt-1'}/></label>
        <label className="block text-xs font-semibold">반납일<input required type="date" value={returnForm.date}
          onChange={(e) => setReturnForm({ ...returnForm, date: e.target.value, requestKey: crypto.randomUUID() })} className={inputStyle + ' mt-1'}/></label>
        <button type="submit" disabled={busy || !selectedRent || !validQty(returnForm.qty) ||
          Number(returnForm.qty) > selectedRent.remaining || !returnForm.date}
          className={primary + ' w-full'}>반납 확정</button>
      </form>
    </Dialog>}
  </section>;
}
