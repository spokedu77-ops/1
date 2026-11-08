'use client';

import Image from 'next/image';
import { ArrowRight, X } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { educationPrograms, educationProgramImageAlt, educationProgramModalContent } from '../data/education';
import '../styles/education-programs.css';

type Program = (typeof educationPrograms)[number];

export function EducationPrograms() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const backdropPointerDownRef = useRef(false);
  const [selected, setSelected] = useState<Program | null>(null);
  const detail = selected ? educationProgramModalContent[selected.id] : null;

  useEffect(() => {
    if (!selected) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog?.open) dialog.close();
    };
  }, [selected]);

  function open(program: Program, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setSelected(program);
  }

  function restoreFocus() {
    backdropPointerDownRef.current = false;
    setSelected(null);
    triggerRef.current?.focus({ preventScroll: true });
  }

  function isBackdrop(event: PointerEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return false;
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  }

  function consult() {
    if (!selected) return;
    dialogRef.current?.close();
    window.dispatchEvent(new CustomEvent('spokedu:education-program', { detail: selected.id }));
    window.requestAnimationFrame(() => {
      const inquiry = document.getElementById('inquiry');
      inquiry?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      inquiry?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    });
  }

  return <>
    <div className="web-card-grid web-education-programs">{educationPrograms.map(program => <article className="web-program-card" key={program.id}>
      <Image unoptimized src={program.image} alt={educationProgramImageAlt(program)} loading="lazy" width={720} height={480} />
      <div className="web-program-body">
        <span className="web-tag">{program.badge}</span><h3>{program.name}</h3><p className="web-education-program-description">{program.description}</p>
        <p className="web-education-program-application">{program.application}</p>
        <button type="button" className="web-text-link web-education-program-link" aria-haspopup="dialog" onClick={event => open(program, event.currentTarget)}>프로그램 자세히 보기 <span aria-hidden="true">→</span><span className="sr-only"> — {program.name}</span></button>
      </div>
    </article>)}</div>
    <dialog ref={dialogRef} className="web-education-program-dialog" aria-labelledby="education-program-title" onClose={restoreFocus}
      onPointerDown={event => { backdropPointerDownRef.current = isBackdrop(event); }}
      onPointerUp={event => {
        if (backdropPointerDownRef.current && isBackdrop(event)) event.currentTarget.close();
        backdropPointerDownRef.current = false;
      }}
      onPointerCancel={() => { backdropPointerDownRef.current = false; }}>
      {selected && detail && <>
        <header className="web-education-program-dialog-header">
          <div><span className="web-tag">{selected.badge}</span><h2 id="education-program-title">{selected.name}</h2></div>
          <button type="button" aria-label="프로그램 상세 닫기" className="web-education-program-close" onClick={() => dialogRef.current?.close()} autoFocus><X size={20} strokeWidth={1.8} aria-hidden="true" /></button>
        </header>
        <div className="web-education-program-dialog-content">
          <div className="web-education-program-overview">
          <figure className="web-education-program-media"><Image unoptimized src={selected.image} alt={educationProgramImageAlt(selected)} width={720} height={480} /></figure>
          <section><h3>프로그램 소개</h3><p className="web-education-program-summary">{detail.summary}</p><p>{detail.intro}</p></section>
          </div>
          <div className="web-education-program-facts">
          <section><h3>{detail.activityLabel}</h3><ul>{detail.activities.map(item => <li key={item}>{item}</li>)}</ul></section>
          <section><h3>{detail.secondaryLabel}</h3><p>{detail.secondary}</p>{detail.note && <p className="web-education-program-note">{detail.note}</p>}</section>
          </div>
        </div>
        <footer className="web-education-program-dialog-footer"><button type="button" className="web-education-program-consult" onClick={consult}>이 프로그램으로 상담하기<ArrowRight size={18} aria-hidden="true" /></button></footer>
      </>}
    </dialog>
  </>;
}
