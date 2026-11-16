'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Lock, X } from 'lucide-react';
import { MASTER_PRODUCT_CATALOG } from '../../lib/productCatalog';
import styles from './LessonAccessModal.module.css';

export function LessonAccessModal({ title, paymentHref, onClose }: {
  title: string;
  paymentHref: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="lesson-access-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={styles.card} data-lesson-access-modal>
        <button type="button" className={styles.close} onClick={onClose} aria-label="닫기" autoFocus><X size={18} /></button>
        <div className={styles.lock}><Lock size={20} /></div>
        <span className={styles.label}>라이트 전용 콘텐츠</span>
        <h2 id="lesson-access-title">이 수업은 라이트 이용권으로 확인할 수 있습니다.</h2>
        <p className={styles.description}>라이트 이용권을 구독하면 놀이체육 수업 자료를 이용할 수 있습니다. 구독 후 선택한 수업으로 돌아와 이어서 확인할 수 있습니다.</p>
        <section className={styles.info}>
          <div className={styles.infoHeading}><BookOpen size={16} /><div><h3>구독 후 이어서 보기</h3><p>구독 후 선택한 수업의 상세 내용을 확인할 수 있습니다.</p></div></div>
          <dl>
            <div><dt>선택한 수업</dt><dd>놀이체육 · {title}</dd></div>
            <div><dt>이용 가능한 자료</dt><dd>수업 목표 · 준비물 · 활동 방법 · 지도 포인트</dd></div>
            <div><dt>필요한 이용권</dt><dd><span className={styles.plan}>라이트 이상</span></dd></div>
          </dl>
        </section>
        <Link href={paymentHref} className={styles.primary}>라이트 구독하기 <span>{MASTER_PRODUCT_CATALOG.lite.priceLabel}</span><ArrowRight size={14} /></Link>
        <button type="button" className={styles.secondary} onClick={onClose}><ArrowLeft size={14} />이전 화면으로 돌아가기</button>
      </div>
    </dialog>
  );
}

/** Preserve the existing payment URL; only add the requested pre-checkout notice. */
export function LessonAccessLink({ href, title, children, className, 'aria-label': ariaLabel }: {
  href: string; title: string; children: ReactNode; className?: string; 'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <Link href={href} className={className} aria-label={ariaLabel} onClick={event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault(); setOpen(true);
    }}>{children}</Link>
    {open ? <LessonAccessModal title={title} paymentHref={href} onClose={() => setOpen(false)} /> : null}
  </>;
}
