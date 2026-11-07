'use client';

import { useId, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import styles from './SettlementSheet.module.css';

type Option = { id: string; label: string; detail?: string; disabled?: boolean };

export default function SettlementSearchSelect({ label, selectedLabel, query, onQueryChange, options, onSelect, loading = false, error, onRetry }: {
  label: string; selectedLabel?: string; query: string; onQueryChange: (value: string) => void;
  options: Option[]; onSelect: (id: string) => void; loading?: boolean; error?: string; onRetry?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <div className={styles.importSelect} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
    <button ref={trigger} type="button" className={styles.importTrigger} aria-expanded={open} aria-controls={id}
      onClick={() => setOpen((value) => !value)}><span>{selectedLabel || label}</span><ChevronDown size={16} aria-hidden="true" /></button>
    {open && <div id={id} className={styles.importMenu}>
      <label className={styles.importSearch}><Search size={16} aria-hidden="true" /><input autoFocus type="search" aria-label={label} placeholder={label}
        maxLength={100} value={query} onChange={(event) => onQueryChange(event.target.value)} /></label>
      <div className={styles.importOptions}>
        {loading ? <p role="status">불러오는 중…</p> : error ? <p role="alert">{error} <button type="button" onClick={onRetry}>다시 시도</button></p>
          : options.length ? options.map((option) => <button key={option.id} type="button" disabled={option.disabled}
            onClick={() => { onSelect(option.id); close(); }}><span>{option.label}{option.disabled ? ' · 추가됨' : ''}</span>{option.detail && <small>{option.detail}</small>}</button>)
          : <p role="status">검색 결과가 없습니다.</p>}
      </div>
    </div>}
  </div>;
}
