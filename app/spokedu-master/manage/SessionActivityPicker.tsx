'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BottomSheet } from '../components/ui/BottomSheet';
import { SPM_PRIMARY_BTN_FULL } from '../lib/masterActionGrammar';

export type ActivityPickerItem = {
  key: `program:${string}` | `spomove:${string}`;
  title: string;
  description: string;
  searchText?: string;
};

export function SessionActivityPicker({
  open,
  programs,
  spomove,
  favorites,
  saving,
  onAdd,
  onClose,
}: {
  open: boolean;
  programs: ActivityPickerItem[];
  spomove: ActivityPickerItem[];
  favorites: ActivityPickerItem[];
  saving: boolean;
  onAdd: (keys: string[]) => Promise<void> | void;
  onClose: () => void;
}) {
  const [source, setSource] = useState<'program' | 'spomove' | 'favorite'>('program');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko');
    const items = source === 'program' ? programs : source === 'spomove' ? spomove : favorites;
    return items.filter((item) => !normalized || `${item.title} ${item.description} ${item.searchText ?? ''}`.toLocaleLowerCase('ko').includes(normalized));
  }, [favorites, programs, query, source, spomove]);

  const close = () => {
    setSelected([]);
    setQuery('');
    onClose();
  };

  const submit = async () => {
    await onAdd(selected);
    setSelected([]);
    setQuery('');
  };

  return (
    <BottomSheet open={open} title="활동 추가" onClose={close} footer={
      <div className="border-t border-slate-200 bg-white px-1 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        <button type="button" disabled={saving || selected.length === 0} onClick={() => void submit()} className={SPM_PRIMARY_BTN_FULL}>선택한 활동 추가 {selected.length ? `${selected.length}개` : ''}</button>
      </div>
    }>
      <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="활동 종류">
        {(['program', 'spomove', 'favorite'] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={source === value} onClick={() => setSource(value)} className={`min-h-11 rounded-lg text-sm font-semibold ${source === value ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>{value === 'program' ? '놀이체육' : value === 'spomove' ? 'SPOMOVE' : '즐겨찾기'}</button>)}
      </div>
      <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3">
        <Search size={16} className="text-slate-400" />
        <span className="sr-only">활동 검색</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="활동 검색" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
      </label>
      <div className="mt-3 divide-y divide-slate-100">
        {visible.map((item) => {
          const checked = selected.includes(item.key);
          return <label key={item.key} className="flex min-h-16 cursor-pointer items-center gap-3 py-2"><input type="checkbox" checked={checked} onChange={() => setSelected((current) => checked ? current.filter((key) => key !== item.key) : [...current, item.key])} className="h-5 w-5 rounded border-slate-300 accent-emerald-600" /><span className="min-w-0"><strong className="block truncate text-sm font-semibold text-slate-800">{item.title}</strong>{item.description ? <small className="mt-0.5 block truncate text-xs text-slate-500">{item.description}</small> : null}</span></label>;
        })}
        {!visible.length ? <p className="py-8 text-center text-sm text-slate-400">추가할 활동이 없습니다.</p> : null}
      </div>
    </BottomSheet>
  );
}
