'use client';

import { useEffect, useRef, useState } from 'react';
import { StickyNote, X } from 'lucide-react';
import styles from './SettlementSheet.module.css';

export default function SettlementNote({ name, value, disabled, onSave }: {
  name: string; value: string; disabled: boolean; onSave: (value: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (disabled) dialog.current?.close(); }, [disabled]);
  return <>
    <button type="button" className={`${styles.noteButton} ${value ? styles.noteButtonFilled : ''}`}
      title={value || '메모 추가'} aria-label={`${name} 메모${value ? ' 보기' : ' 추가'}`} aria-haspopup="dialog"
      onClick={() => { setDraft(value); dialog.current?.showModal(); }}><StickyNote size={16} aria-hidden="true" />{value && <span className={styles.noteDot} />}</button>
    <dialog ref={dialog} className={styles.noteDialog} aria-label={`${name} 메모`} onClick={(event) => {
      if (event.target === event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
      }
    }}>
      <form onSubmit={(event) => { event.preventDefault(); if (!disabled) onSave(draft); dialog.current?.close(); }}>
        <header className={styles.noteHeader}><strong>{name || '수업'} 메모</strong><button type="button" aria-label="메모창 닫기" onClick={() => dialog.current?.close()}><X size={18} /></button></header>
        <textarea autoFocus className={styles.noteEditor} aria-label={`${name} 메모 내용`} value={draft} readOnly={disabled} placeholder="메모를 입력하세요." onChange={(event) => setDraft(event.target.value)} />
        <footer className={styles.noteFooter}><button type="button" className={styles.secondaryButton} onClick={() => dialog.current?.close()}>{disabled ? '닫기' : '취소'}</button>{!disabled && <button type="submit" className={styles.primaryButton}>적용</button>}</footer>
      </form>
    </dialog>
  </>;
}
