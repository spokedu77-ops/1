'use client';

import { useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import styles from './SettlementSheet.module.css';
import { formatMoneyExpression } from './settlementMoney';

export default function MoneyInput({ className = '', showSuffix = true, value, defaultValue, onChange, onFocus, onBlur, ...props }:
  InputHTMLAttributes<HTMLInputElement> & { showSuffix?: boolean }) {
  const [draft, setDraft] = useState(String(defaultValue ?? ''));
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  const raw = String(value ?? draft);
  useLayoutEffect(() => {
    if (caret.current === null || !input.current) return;
    const text = input.current.value;
    let position = 0; let count = 0;
    while (position < text.length && count < caret.current) { if (text[position] !== ',') count += 1; position += 1; }
    if (input.current.selectionStart !== null) input.current.setSelectionRange(position, position);
    caret.current = null;
  });
  return <div className={styles.moneyField}><input {...props} ref={input}
    value={formatMoneyExpression(raw)}
    inputMode={props.inputMode ?? 'decimal'} className={`${className} ${showSuffix ? styles.moneyFieldInput : ''}`}
    onFocus={onFocus}
    onBlur={onBlur}
    onChange={(event) => {
      caret.current = event.currentTarget.value.slice(0, event.currentTarget.selectionStart ?? event.currentTarget.value.length).replace(/,/g, '').length;
      const next = event.currentTarget.value.replace(/,/g, '');
      event.currentTarget.value = next;
      setDraft(next);
      onChange?.(event);
    }} />{showSuffix && <span className={styles.moneySuffix} aria-hidden="true">원</span>}</div>;
}
