'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { HOME_MEDIA } from '../../data/home-media';
import { homePage, type HomeCaseCard } from '../../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../../lib/resolve-field-records';
import { brandFocusRing, homeSkipLink, koreanText, marketingHeroDisplay, marketingSectionDisplay } from '../../lib/ui-classes';
import { TrackedLink } from './tracked-link';
import styles from './home-editorial.module.css';

type CaseCardWithThumb = HomeCaseCard & { thumbnailSrc?: string };
type HomeEditorialLandingProps = { caseCards: CaseCardWithThumb[] };
type FieldTab = 'field' | 'content' | 'system';

const SERVICE_IMAGES = [
  { src: '/images/spokedu/dispatch/dispatch-institution-class.jpg', alt: '학교와 기관에서 진행하는 체육수업 현장', position: '50% 48%' },
  { src: '/images/spokedu/private/private-small-group.jpg', alt: '아이와 지도자가 함께하는 소그룹 체육수업', position: '58% 45%' },
  { src: '/images/spokedu/subscription/product-library-home.webp', alt: '지도자가 수업을 준비하는 SPOKEDU 서비스 화면', position: '50% 20%' },
] as const;

const FIELD_TABS: readonly { id: FieldTab; label: string; note: string }[] = [
  { id: 'field', label: 'FIELD', note: '직접 운영하는 체육수업' },
  { id: 'content', label: 'CONTENT', note: '놀이체육 · SPOMOVE' },
  { id: 'system', label: 'SYSTEM', note: '스포키듀 구독시스템' },
];

const HERO_LINES = [
  '학교·기관부터',
  '개인·소그룹까지,',
  '아이들의 체육수업을',
  '직접 설계하고 운영합니다.',
] as const;

function useHomeReveal() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const nodes = root.querySelectorAll<HTMLElement>('[data-reveal]');
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      (entry.target as HTMLElement).dataset.revealed = 'true';
      observer.unobserve(entry.target);
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  return rootRef;
}

function ArrowLink({ href, trackLabel, children, light = false }: { href: string; trackLabel: string; children: ReactNode; light?: boolean }) {
  return (
    <TrackedLink href={href} trackLabel={trackLabel} className={`${styles.arrowLink} ${light ? styles.arrowLinkLight : ''} ${brandFocusRing}`}>
      <span>{children}</span><span aria-hidden>→</span>
    </TrackedLink>
  );
}

function mergeCaseCards(resolved: HomeFieldRecordCardWithThumbnail[]): CaseCardWithThumb[] {
  const bySlug = new Map(resolved.map((card) => [card.slug, card]));
  return homePage.cases.cards.map((item) => {
    const resolvedCard = bySlug.get(item.slug);
    return resolvedCard ? { ...item, thumbnailSrc: resolvedCard.thumbnailSrc } : item;
  });
}

export function mergeHomeEditorialCaseCards(resolved: HomeFieldRecordCardWithThumbnail[]): CaseCardWithThumb[] {
  return mergeCaseCards(resolved);
}

export function HomeEditorialLanding({ caseCards }: HomeEditorialLandingProps) {
  const rootRef = useHomeReveal();
  const recordRailRef = useRef<HTMLUListElement>(null);
  const [activeService, setActiveService] = useState(0);
  const [activeFieldTab, setActiveFieldTab] = useState<FieldTab>('field');
  const [recordPosition, setRecordPosition] = useState({ atStart: true, atEnd: false });
  const heroMedia = HOME_MEDIA[homePage.hero.mediaKey];
  const service = homePage.serviceChoices[activeService];
  const serviceImage = SERVICE_IMAGES[activeService];

  const updateRecordPosition = () => {
    const rail = recordRailRef.current;
    if (!rail) return;
    setRecordPosition({
      atStart: rail.scrollLeft <= 2,
      atEnd: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2,
    });
  };

  const moveRecords = (direction: -1 | 1) => {
    const rail = recordRailRef.current;
    if (!rail) return;
    const item = rail.querySelector<HTMLElement>('li');
    const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap) || 0;
    rail.scrollBy({ left: direction * ((item?.offsetWidth ?? rail.clientWidth * .8) + gap), behavior: 'smooth' });
  };

  useEffect(() => {
    updateRecordPosition();
    window.addEventListener('resize', updateRecordPosition);
    return () => window.removeEventListener('resize', updateRecordPosition);
  }, []);

  return (
    <div ref={rootRef} className={styles.page} data-spokedu-home-editorial="integrated-v3">
      <a href="#choice" className={homeSkipLink}>본문으로 건너뛰기</a>

      <section id={homePage.hero.id} className={styles.hero} aria-labelledby="home-hero-heading">
        <div className={`${styles.rail} ${styles.heroInner}`}>
          <div className={styles.heroCopy} data-reveal>
            <p className={styles.eyebrow}>{homePage.hero.eyebrow}</p>
            <h1 id="home-hero-heading" className={`${marketingHeroDisplay} !text-[clamp(44px,5vw,68px)] max-[480px]:!text-[38px] ${styles.heroHeadingLayout}`}>
              {HERO_LINES.map((line) => <span key={line}>{line}</span>)}
            </h1>
            <p className={`${styles.heroLead} ${koreanText}`}>{homePage.hero.support}</p>
          </div>
          <figure className={styles.heroFigure} data-reveal>
            <Image src={heroMedia.src!} alt={heroMedia.alt} fill priority sizes="(min-width: 960px) 58vw, 100vw" className={styles.heroImage} />
          </figure>
        </div>
      </section>

      <section className={styles.intentBridge} aria-label="방문 목적">
        <div className={styles.rail} data-reveal>
          <nav className={styles.intent} aria-label="방문 목적 선택">
            <p>무엇을 찾고 계신가요?</p>
            <TrackedLink href={homePage.hero.primaryCta.href} trackLabel={homePage.hero.primaryCta.trackLabel} className={`${styles.intentRow} ${brandFocusRing}`}>
              <span>01</span><strong>수업을 맡기고 싶어요</strong><i aria-hidden>→</i>
            </TrackedLink>
            <TrackedLink href={homePage.hero.secondaryCta.href} trackLabel={homePage.hero.secondaryCta.trackLabel} className={`${styles.intentRow} ${brandFocusRing}`}>
              <span>02</span><strong>지도자용 수업자료를 찾고 있어요</strong><i aria-hidden>→</i>
            </TrackedLink>
          </nav>
        </div>
      </section>

      <section id={homePage.choice.id} className={styles.explorer} aria-labelledby="service-heading">
        <div className={styles.rail} data-reveal>
          <header className={styles.sectionHeader}>
            <p className={styles.sectionCode}>02 / SERVICE EXPLORER</p>
            <h2 id="service-heading" className={marketingSectionDisplay}>필요한 서비스를 선택하세요.</h2>
          </header>
          <div className={styles.explorerGrid}>
            <div className={styles.serviceSelector} role="tablist" aria-label="서비스 선택">
              {homePage.serviceChoices.map((item, index) => (
                <button key={item.href} type="button" role="tab" aria-selected={activeService === index}
                  aria-controls="selected-service" className={activeService === index ? styles.serviceSelected : styles.serviceOption}
                  onClick={() => setActiveService(index)}>
                  <span>{String(index + 1).padStart(2, '0')}</span><strong>{item.label}</strong><i aria-hidden>→</i>
                </button>
              ))}
            </div>
            <article id="selected-service" role="tabpanel" className={styles.serviceStage} key={service.href}>
              <div className={styles.serviceVisual}>
                <Image src={serviceImage.src} alt={serviceImage.alt} fill sizes="(min-width: 960px) 62vw, 100vw" style={{ objectPosition: serviceImage.position }} />
                <span>{service.audience}</span>
              </div>
              <div className={styles.serviceDetail}>
                <div><h3>{service.label}</h3><p className={koreanText}>{service.description}</p></div>
                <ArrowLink href={service.href} trackLabel={service.trackLabel}>{service.action}</ArrowLink>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id={homePage.cases.id} className={styles.records} aria-labelledby="records-heading">
        <div className={styles.rail}>
          <header className={styles.recordsHeader} data-reveal>
            <div><p className={styles.sectionCode}>03 / FIELD RECORDS</p><h2 id="records-heading" className={marketingSectionDisplay}>실제로 운영한 수업입니다.</h2><p>{homePage.cases.lead}</p></div>
            <div className={styles.recordsActions}>
              <div className={styles.recordControls} aria-label="운영 사례 이동">
                <button type="button" aria-label="이전 운영 사례" disabled={recordPosition.atStart} onClick={() => moveRecords(-1)}>←</button>
                <button type="button" aria-label="다음 운영 사례" disabled={recordPosition.atEnd} onClick={() => moveRecords(1)}>→</button>
              </div>
              <ArrowLink href={homePage.cases.recordsCta.href} trackLabel={homePage.cases.recordsCta.trackLabel}>운영 사례 전체 보기</ArrowLink>
            </div>
          </header>
          <ul ref={recordRailRef} className={styles.recordRail} tabIndex={0} aria-label="운영 사례 목록" onScroll={updateRecordPosition}>
            {caseCards.map((card, index) => (
              <li key={card.slug} className={styles.recordItem}>
                <TrackedLink href={card.href} trackLabel={card.trackLabel} className={`${styles.recordLink} ${brandFocusRing}`}>
                  <div className={styles.recordImage}><Image src={card.editorialSrc} alt={`${card.headline} 현장`} fill sizes="(min-width: 960px) 31vw, 82vw" style={{ objectPosition: card.editorialObjectPosition ?? '50% 50%' }} /></div>
                  <div className={styles.recordIndex}>{String(index + 1).padStart(2, '0')}<span>{card.kind}</span></div>
                  <h3 className={koreanText}>{card.headline}</h3><p>{card.displayMeta}</p>
                </TrackedLink>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={homePage.spomove.id} className={styles.fieldBuilt} aria-labelledby="field-built-heading">
        <span id={homePage.subscription.id} className={styles.anchor} aria-hidden />
        <div className={styles.rail} data-reveal>
          <header className={styles.fieldHeader}>
            <p className={styles.sectionCode}>04 / BUILT FROM THE FIELD</p>
            <h2 id="field-built-heading" className={marketingSectionDisplay}><span>현장에서 수업하고,</span><span>필요한 콘텐츠와 시스템을 만듭니다.</span></h2>
          </header>
          <div className={styles.fieldTabs} role="tablist" aria-label="현장 기반 서비스 구조">
            {FIELD_TABS.map((tab) => <button key={tab.id} id={`field-tab-${tab.id}`} type="button" role="tab" aria-selected={activeFieldTab === tab.id} aria-controls="field-live-panel"
              className={activeFieldTab === tab.id ? styles.fieldTabActive : styles.fieldTab} onClick={() => setActiveFieldTab(tab.id)}>
              <span>{tab.label}</span><small>{tab.note}</small>
            </button>)}
          </div>
          <div id="field-live-panel" className={styles.fieldStage} role="tabpanel" aria-labelledby={`field-tab-${activeFieldTab}`}>
            {activeFieldTab === 'field' ? <FieldPanel /> : null}
            {activeFieldTab === 'content' ? <ContentPanel /> : null}
            {activeFieldTab === 'system' ? <SystemPanel /> : null}
          </div>
        </div>
      </section>

      <section id={homePage.contact.id} className={styles.next} aria-labelledby="next-heading">
        <div className={styles.rail} data-reveal>
          <p className={styles.sectionCode}>05 / NEXT ACTION</p><h2 id="next-heading" className={`${marketingSectionDisplay} ${styles.homeQuietDisplay}`}>어디에서 시작하시겠어요?</h2>
          <div className={styles.nextRows}>
            <NextRow n="01" title="기관 · 학교" desc="우리 기관과 대상에 맞는 수업을 상담합니다." {...homePage.contact.primaryCta} />
            <NextRow n="02" title="개인 · 소그룹" desc="아이에게 맞는 수업 방식과 조건을 확인합니다." {...homePage.contact.secondaryCta} />
            <NextRow n="03" title="체육 지도자" desc="수업자료와 SPOMOVE 콘텐츠를 확인합니다." {...homePage.contact.supportCta} />
          </div>
        </div>
      </section>
    </div>
  );
}

function FieldPanel() {
  const media = HOME_MEDIA[homePage.hero.mediaKey];
  return <div className={styles.panelGrid}><div className={styles.panelMedia}><Image src={media.src!} alt={media.alt} fill sizes="(min-width: 960px) 66vw, 100vw" /></div><div className={styles.panelCopy}><p>직접 운영하는 체육수업</p><h3>대상과 환경에 맞춰 수업을 직접 설계하고 운영합니다.</h3><ArrowLink href="/records" trackLabel="cta-home-built-field" light>운영 사례 보기</ArrowLink></div></div>;
}

function ContentPanel() {
  return <div className={styles.panelGrid}><div className={styles.panelMedia}><Image src={homePage.spomove.screen.src} alt={homePage.spomove.screen.alt} fill sizes="(min-width: 960px) 66vw, 100vw" style={{ objectPosition: homePage.spomove.screen.objectPosition }} /></div><div className={styles.panelCopy}><p>놀이체육 · SPOMOVE</p><h3>{homePage.spomove.title}</h3><span>{homePage.spomove.definition}</span><ArrowLink href={homePage.spomove.primaryCta.href} trackLabel={homePage.spomove.primaryCta.trackLabel} light>SPOMOVE 자세히 보기</ArrowLink></div></div>;
}

function SystemPanel() {
  return <div className={styles.panelGrid}><div className={`${styles.panelMedia} ${styles.systemMedia}`}><Image src={homePage.subscription.visual.src} alt={homePage.subscription.visual.alt} fill sizes="(min-width: 960px) 66vw, 100vw" /></div><div className={styles.panelCopy}><p>스포키듀 구독시스템</p><h3>수업을 찾고 준비합니다.</h3><span>{homePage.subscription.lead}</span><ArrowLink href={homePage.subscription.primaryCta.href} trackLabel={homePage.subscription.primaryCta.trackLabel} light>구독시스템 보기</ArrowLink></div></div>;
}

function NextRow({ n, title, desc, href, trackLabel }: { n: string; title: string; desc: string; href: string; trackLabel: string; label?: string }) {
  return <TrackedLink href={href} trackLabel={trackLabel} className={`${styles.nextRow} ${brandFocusRing}`}><span>{n}</span><div><h3>{title}</h3><p>{desc}</p></div><i aria-hidden>→</i></TrackedLink>;
}

export default HomeEditorialLanding;
