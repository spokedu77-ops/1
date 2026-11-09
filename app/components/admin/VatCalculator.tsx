'use client';

import { useRef, useState } from 'react';
import { Calculator, X } from 'lucide-react';
import styles from './VatCalculator.module.css';

export default function VatCalculator({ className }: { className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<'total' | 'supply'>('total');
  const [input, setInput] = useState('');
  const amount = Number(input) || 0;
  const vat = Math.round(mode === 'total' ? amount / 11 : amount / 10);
  const supply = mode === 'total' ? amount - vat : amount;
  const total = mode === 'total' ? amount : amount + vat;

  return <>
    <button type="button" className={className || styles.trigger} onClick={() => dialog.current?.showModal()}><Calculator size={15} />부가세 계산기</button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="vat-calculator-title" onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.current?.close();
    }}>
      <header className={styles.header}><h2 id="vat-calculator-title">부가세 계산기</h2><button type="button" aria-label="부가세 계산기 닫기" onClick={() => dialog.current?.close()}><X size={20} /></button></header>
      <p className={styles.hint}>부가세 10% · 원 단위 반올림</p>
      <div className={styles.modes} role="group" aria-label="입력 금액 기준">
        <button type="button" aria-pressed={mode === 'total'} onClick={() => setMode('total')}>부가세 포함</button>
        <button type="button" aria-pressed={mode === 'supply'} onClick={() => setMode('supply')}>부가세 별도</button>
      </div>
      <label className={styles.label} htmlFor="vat-calculator-amount">{mode === 'total' ? '합계금액' : '공급가액'}</label>
      <div className={styles.input}><input id="vat-calculator-amount" autoFocus inputMode="numeric" autoComplete="off" placeholder="금액 입력" value={input ? Number(input).toLocaleString('ko-KR') : ''} onChange={(event) => setInput(event.target.value.replace(/\D/g, '').slice(0, 15))} /><span>원</span></div>
      <dl className={styles.results}>
        <div><dt>공급가액</dt><dd>{supply.toLocaleString('ko-KR')}<small>원</small></dd></div>
        <div><dt>부가세</dt><dd>{vat.toLocaleString('ko-KR')}<small>원</small></dd></div>
        <div><dt>합계금액</dt><dd>{total.toLocaleString('ko-KR')}<small>원</small></dd></div>
      </dl>
    </dialog>
  </>;
}
