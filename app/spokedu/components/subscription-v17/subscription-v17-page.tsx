'use client';
/* eslint-disable @next/next/no-img-element -- The reference lightbox must preserve the selected image's runtime URL. */

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CurriculumCommercialMode } from '../../data/curriculum-commercial-modes';
import { curriculumModeList } from '../../data/curriculum-commercial-modes';
import { getPublicProductContract } from '../../data/public-product-contract';
import { TrackedLink } from '../home/tracked-link';
import { subscriptionV17Sections } from './subscription-v17-source';
import styles from './subscription-v17.module.css';

const publicProduct = getPublicProductContract();
type ModeHandler = (mode: CurriculumCommercialMode, hash?: string) => void;

function CurrentPlans({ mode, onModeChange, inquiry }: { mode: CurriculumCommercialMode; onModeChange: ModeHandler; inquiry?: ReactNode }) {
  const featureRows = [...new Set(publicProduct.plans.flatMap((plan) => plan.featureSummary))];
  return (
    <div className="container">
        <span className="eyebrow">현재 구독 구성</span>
        <h2 className="section-title section-title--small">필요한 수업 범위에 따라<br /><span className="accent">이용 권한을 선택합니다.</span></h2>
        <p className="section-lead">가격과 이용 권한, 판매 가능 여부는 현재 공개 제품 계약을 기준으로 표시합니다.<br />센터·기관은 셀프 구독 플랜이 아닌 별도 문의 방식으로 안내합니다.</p>
        <div className="comparison-wrap">
          <table className="comparison-table">
            <thead><tr><th scope="col">기능</th>{publicProduct.plans.map((plan) => <th scope="col" key={plan.code}>{plan.displayName}</th>)}</tr></thead>
            <tbody>{featureRows.map((feature) => <tr key={feature}><td>{feature}</td>{publicProduct.plans.map((plan) => <td key={plan.code} className={plan.featureSummary.includes(feature) ? 'yes' : undefined}>{plan.featureSummary.includes(feature) ? '제공' : '—'}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className="pricing-grid">
          {publicProduct.plans.map((plan) => {
            const featured = plan.code === 'premium';
            const href = plan.code === 'free' ? publicProduct.handoff.freeStartHref : publicProduct.handoff.paymentPlanHref(plan.code);
            return <article key={plan.code} className={`price-card${featured ? ' price-card--featured' : ''}`} data-plan-code={plan.code} data-purchasable={String(plan.purchasable)}>
              {featured ? <span className="price-badge">전체 기능</span> : null}<small>{plan.billingCycleLabel}</small><h3>{plan.displayName}</h3>
              <div className="price">{plan.priceLabel ?? plan.billingCycleLabel}{plan.priceLabel ? <span> / 월</span> : null}</div>
              <ul>{plan.featureSummary.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              <TrackedLink href={href} trackLabel={`curriculum-plan-${plan.code}`} commercialRoute="curriculum" ctaIntentId={plan.code === 'free' ? 'free_start' : 'master_handoff'} className={`button ${featured ? 'button--primary' : 'button--secondary'}`}>{plan.code === 'free' ? '무료로 시작하기' : `${plan.displayName} 시작하기`}</TrackedLink>
            </article>;
          })}
        </div>
        <p className="price-note">{publicProduct.freeScopeNote}</p>
        <article className="price-card center-inquiry" data-center-inquiry="true"><small>{publicProduct.centerInquiry.billingCycleLabel}</small><h3>{publicProduct.centerInquiry.displayName}</h3><p>{publicProduct.centerInquiry.summary.join(' · ')}</p><button type="button" className="button button--secondary" onClick={() => onModeChange('master', 'inquiry')}>{publicProduct.centerInquiry.ctaLabel}</button></article>
        <div className="commercial-modes" id="modes"><p className="price-note">교육·라이선스 별도 문의</p>{curriculumModeList.map((item) => <button key={item.id} type="button" className="button button--secondary" aria-pressed={item.id === mode} onClick={() => onModeChange(item.id)}>{item.title}</button>)}</div>
        {inquiry}
    </div>
  );
}

export function SubscriptionV17Page({ mode, onModeChange, inquiry, reducedMotion }: { mode: CurriculumCommercialMode; onModeChange: ModeHandler; inquiry?: ReactNode; reducedMotion: boolean | null }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [plansPortal, setPlansPortal] = useState<Element | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    setPlansPortal(root.querySelector('#subscription-v17-plans-portal'));
    const images = root.querySelectorAll<HTMLImageElement>('img');
    images.forEach((image) => { image.tabIndex = 0; image.setAttribute('role', 'button'); image.setAttribute('aria-label', `${image.alt || '이미지'} 확대 보기`); });
    const open = (image: HTMLImageElement) => setLightbox({ src: image.currentSrc || image.src, alt: image.alt || '확대 이미지' });
    const onClick = (event: Event) => { const target = event.target; if (target instanceof HTMLImageElement) open(target); };
    const onKeyDown = (event: KeyboardEvent) => { const target = event.target; if (target instanceof HTMLImageElement && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); open(target); } };
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKeyDown);
    const targets = root.querySelectorAll('.section-title, .section-lead, .four-pillar-grid > *, .journey-step, .problem-item, .solution-panel, .feature-split, .bingo-card, .spomove-flow > *, .series-card, .tool-card, .record-card, .audience-card, .price-card, .faq, .cta-panel, .compare-row, .scenario-card, .change-card, .trust-layout, .trust-metric, .career-card, .environment-panel');
    targets.forEach((element, index) => element.classList.add('reveal', `reveal-delay-${(index % 4) + 1}`));
    let observer: IntersectionObserver | null = null;
    if (reducedMotion || !('IntersectionObserver' in window)) targets.forEach((element) => element.classList.add('is-visible'));
    else { observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer?.unobserve(entry.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px' }); targets.forEach((element) => observer?.observe(element)); }
    return () => { observer?.disconnect(); root.removeEventListener('click', onClick); root.removeEventListener('keydown', onKeyDown); };
  }, [reducedMotion]);
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setLightbox(null); }; document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close); }, []);
  return <Fragment><div ref={rootRef} className={`${styles.root} subscription-v17`} data-spokedu-curriculum-sections={19} dangerouslySetInnerHTML={{ __html: subscriptionV17Sections.join('') }} />{plansPortal ? createPortal(<CurrentPlans mode={mode} onModeChange={onModeChange} inquiry={inquiry} />, plansPortal) : null}{lightbox ? <div className={`${styles.root} subscription-v17 image-lightbox is-open`} id="imageLightbox" aria-hidden="false" onClick={(event) => { if (event.currentTarget === event.target) setLightbox(null); }}><div className="image-lightbox__dialog" role="dialog" aria-modal="true" aria-label="확대 이미지 보기"><button className="image-lightbox__close" type="button" aria-label="확대 이미지 닫기" onClick={() => setLightbox(null)}>×</button><img className="image-lightbox__image" src={lightbox.src} alt={lightbox.alt} /><p className="image-lightbox__caption">{lightbox.alt}</p></div></div> : null}</Fragment>;
}
