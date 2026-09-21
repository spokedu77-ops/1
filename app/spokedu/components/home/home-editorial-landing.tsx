'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { HOME_MEDIA } from '../../data/home-media';
import { HOME_IMAGE_SLOTS } from '../../data/home-image-roles';
import { homePage, type HomeCaseCard } from '../../data/home-page';
import type { HomeFieldRecordCardWithThumbnail } from '../../lib/resolve-field-records';
import { brandFocusRing, homeSkipLink, koreanText, marketingHeroDisplay, marketingSectionDisplay } from '../../lib/ui-classes';
import { HomeChevron } from './home-chevron';
import { TrackedLink } from './tracked-link';
import styles from './home-editorial.module.css';

type CaseCardWithThumb = HomeCaseCard & { thumbnailSrc?: string };
type HomeEditorialLandingProps = { caseCards: CaseCardWithThumb[] };
type FieldTab = 'field' | 'content' | 'system';

const SERVICE_SLOTS = [
  HOME_IMAGE_SLOTS['explorer-institution'],
  HOME_IMAGE_SLOTS['explorer-private'],
  HOME_IMAGE_SLOTS['explorer-subscription'],
] as const;

const FIELD_TABS: readonly { id: FieldTab; label: string; note: string }[] = [
  { id: 'field', label: 'FIELD', note: '직접 운영하는 체육수업' },
  { id: 'content', label: 'CONTENT', note: '놀이체육 프로그램' },
  { id: 'system', label: 'SYSTEM', note: '스포키듀 구독시스템' },
];

function Arrow({ className = '' }: { className?: string }) {
  return (
    <span className={`${styles.arrow} ${className}`} aria-hidden>
      <HomeChevron />
    </span>
  );
}

function ArrowLink({ href, trackLabel, children, light = false }: { href: string; trackLabel: string; children: ReactNode; light?: boolean }) {
  return (
    <TrackedLink href={href} trackLabel={trackLabel} className={`${styles.arrowLink} ${light ? styles.arrowLinkLight : ''} ${brandFocusRing}`}>
      <span>{children}</span>
      <Arrow />
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
  const recordRailRef = useRef<HTMLUListElement>(null);
  const [activeService, setActiveService] = useState(0);
  const [activeFieldTab, setActiveFieldTab] = useState<FieldTab>('field');
  const [recordPosition, setRecordPosition] = useState({ atStart: true, atEnd: false });
  const heroMedia = HOME_MEDIA[homePage.hero.mediaKey];
  const service = homePage.serviceChoices[activeService];
  const serviceMedia = HOME_MEDIA[service.mediaKey];
  const serviceSlot = SERVICE_SLOTS[activeService];
  const serviceIsProduct = serviceSlot.origin === 'product-ui';
  const serviceFit = serviceIsProduct ? 'contain' : 'cover';
  const servicePosition = serviceMedia.objectPosition ?? (serviceIsProduct ? '50% 50%' : '50% 48%');

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
    <div className={styles.page} data-spokedu-home-editorial="field-in-motion">
      <a href="#choice" className={homeSkipLink}>본문으로 건너뛰기</a>

      <section id={homePage.hero.id} className={styles.hero} aria-labelledby="home-hero-heading">
        <figure className={styles.heroMedia}>
          <Image
            src={heroMedia.src!}
            alt={heroMedia.alt}
            fill
            priority
            quality={90}
            sizes="100vw"
            className={styles.heroImage}
            style={{ objectPosition: heroMedia.objectPosition ?? '68% 42%' }}
          />
        </figure>
        <div className={styles.heroStage}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>{homePage.hero.eyebrow}</p>
            <h1 id="home-hero-heading" className={`${marketingHeroDisplay} ${styles.heroHeading}`}>
              <span>{homePage.hero.lines[0]}</span>
              <span>{homePage.hero.lines[1]}</span>
            </h1>
            <p className={`${styles.heroLead} ${koreanText}`}>{homePage.hero.support}</p>
            <nav className={styles.heroCtas} aria-label="다음 행동">
              <TrackedLink href={homePage.hero.primaryCta.href} trackLabel={homePage.hero.primaryCta.trackLabel} className={`${styles.heroCta} ${brandFocusRing}`}>
                <span>{homePage.hero.primaryCta.label}</span>
                <Arrow />
              </TrackedLink>
              <TrackedLink href={homePage.hero.secondaryCta.href} trackLabel={homePage.hero.secondaryCta.trackLabel} className={`${styles.heroCta} ${brandFocusRing}`}>
                <span>{homePage.hero.secondaryCta.label}</span>
                <Arrow />
              </TrackedLink>
            </nav>
          </div>
        </div>
      </section>

      <section id={homePage.choice.id} className={styles.explorer} aria-labelledby="service-heading">
        <div className={styles.explorerGrid}>
          <div className={styles.serviceSelectorWrap}>
            <p className={styles.sectionCode}>02 / EXPLORE SPOKEDU</p>
            <h2 id="service-heading" className={`${marketingSectionDisplay} ${styles.explorerHeading}`}>{homePage.choice.title}</h2>
            <div className={styles.serviceSelector} role="tablist" aria-label="서비스 선택">
              {homePage.serviceChoices.map((item, index) => (
                <button
                  key={item.href}
                  type="button"
                  role="tab"
                  aria-selected={activeService === index}
                  aria-controls="selected-service"
                  className={activeService === index ? styles.serviceSelected : styles.serviceOption}
                  onClick={() => setActiveService(index)}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{item.label}</strong>
                </button>
              ))}
            </div>
          </div>
          <article id="selected-service" role="tabpanel" className={styles.serviceStage} key={service.href}>
            <div className={`${styles.serviceVisual} ${serviceIsProduct ? styles.serviceVisualProduct : ''}`}>
              <Image
                src={serviceMedia.src!}
                alt={serviceMedia.alt}
                fill
                sizes="(min-width: 960px) 72vw, 100vw"
                style={{ objectFit: serviceFit, objectPosition: servicePosition }}
              />
            </div>
            <div className={styles.serviceDetail}>
              <div>
                <h3 className={koreanText}>{service.stageTitle}</h3>
                <p className={koreanText}>{service.description}</p>
              </div>
              <ArrowLink href={service.href} trackLabel={service.trackLabel}>{service.action}</ArrowLink>
            </div>
          </article>
        </div>
      </section>

      <section id={homePage.cases.id} className={styles.records} aria-labelledby="records-heading">
        <div className={styles.rail}>
          <header className={styles.recordsHeader}>
            <div>
              <p className={styles.sectionCode}>03 / FIELD RECORDS</p>
              <h2 id="records-heading" className={`${marketingSectionDisplay} ${styles.recordsHeading}`}>
                <span>수업은</span>
                <span>현장에서 증명됩니다.</span>
              </h2>
            </div>
            <div className={styles.recordsActions}>
              <div className={styles.recordControls} aria-label="운영 사례 이동">
                <button type="button" aria-label="이전 운영 사례" disabled={recordPosition.atStart} onClick={() => moveRecords(-1)}>
                  <HomeChevron />
                </button>
                <button type="button" aria-label="다음 운영 사례" disabled={recordPosition.atEnd} onClick={() => moveRecords(1)}>
                  <HomeChevron />
                </button>
              </div>
              <ArrowLink href={homePage.cases.recordsCta.href} trackLabel={homePage.cases.recordsCta.trackLabel}>
                {homePage.cases.recordsCta.label}
              </ArrowLink>
            </div>
          </header>
        </div>
        <div className={styles.recordTrack}>
          <ul ref={recordRailRef} className={styles.recordRail} tabIndex={0} aria-label="운영 사례 목록" onScroll={updateRecordPosition}>
            {caseCards.map((card, index) => (
              <li key={card.slug} className={styles.recordItem} aria-posinset={index + 1} aria-setsize={caseCards.length}>
                <TrackedLink href={card.href} trackLabel={card.trackLabel} className={`${styles.recordLink} ${brandFocusRing}`}>
                  <div className={styles.recordImage}>
                    <Image
                      src={card.editorialSrc}
                      alt={`${card.headline} 현장`}
                      fill
                      sizes="(min-width: 960px) 34vw, 78vw"
                      style={{ objectPosition: card.editorialObjectPosition ?? '50% 50%' }}
                    />
                  </div>
                  <p className={styles.recordMeta}>{card.displayMeta}</p>
                  <h3 className={koreanText}>{card.headline}</h3>
                  <span className={styles.recordHint}>VIEW RECORD</span>
                </TrackedLink>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={homePage.spomove.id} className={styles.fieldBuilt} aria-labelledby="field-built-heading">
        <span id={homePage.subscription.id} className={styles.anchor} aria-hidden />
        <div className={styles.rail}>
          <header className={styles.fieldHeader}>
            <p className={styles.sectionCode}>04 / BUILT FROM THE FIELD</p>
            <h2 id="field-built-heading" className={`${marketingSectionDisplay} ${styles.fieldHeading}`}>
              <span>현장에서 필요한 것을</span>
              <span>직접 만듭니다.</span>
            </h2>
            <p className={`${styles.fieldLead} ${koreanText}`}>수업에서 시작해 콘텐츠와 시스템으로 확장합니다.</p>
          </header>
          <div className={styles.fieldTabs} role="tablist" aria-label="현장 기반 서비스 구조">
            {FIELD_TABS.map((tab) => (
              <button
                key={tab.id}
                id={`field-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeFieldTab === tab.id}
                aria-controls="field-live-panel"
                className={activeFieldTab === tab.id ? styles.fieldTabActive : styles.fieldTab}
                onClick={() => setActiveFieldTab(tab.id)}
              >
                <span>{tab.label}</span>
                <small>{tab.note}</small>
              </button>
            ))}
          </div>
        </div>
        <div id="field-live-panel" className={styles.fieldStage} role="tabpanel" aria-labelledby={`field-tab-${activeFieldTab}`} key={activeFieldTab}>
          {activeFieldTab === 'field' ? <FieldPanel /> : null}
          {activeFieldTab === 'content' ? <ContentPanel /> : null}
          {activeFieldTab === 'system' ? <SystemPanel /> : null}
        </div>
      </section>

      <section id={homePage.contact.id} className={styles.next} aria-labelledby="next-heading">
        <div className={styles.rail}>
          <p className={styles.sectionCode}>05 / NEXT ACTION</p>
          <h2 id="next-heading" className={`${marketingSectionDisplay} ${styles.homeQuietDisplay}`}>
            <span>어디에서</span>
            <span>시작하시겠어요?</span>
          </h2>
        </div>
        <div className={styles.nextRows}>
          <NextRow n="01" title="기관 · 학교" desc="우리 기관에 맞는 체육수업을 찾습니다." {...homePage.contact.primaryCta} />
          <NextRow n="02" title="개인 · 소그룹" desc="아이에게 맞는 수업을 찾습니다." {...homePage.contact.secondaryCta} />
          <NextRow n="03" title="체육 지도자" desc="수업자료와 SPOMOVE를 확인합니다." {...homePage.contact.supportCta} />
        </div>
      </section>
    </div>
  );
}

function FieldPanel() {
  const media = HOME_MEDIA.homeHeroField;
  return (
    <div className={styles.panelStage}>
      <div className={styles.panelMedia}>
        <Image src={media.src!} alt={media.alt} fill sizes="(min-width: 960px) 92vw, 100vw" style={{ objectPosition: media.objectPosition ?? '58% 48%' }} />
      </div>
      <div className={styles.panelCopy}>
        <p>FIELD</p>
        <h3>직접 운영하는 체육수업</h3>
        <ArrowLink href="/records" trackLabel="cta-home-built-field" light>운영 사례 보기</ArrowLink>
      </div>
    </div>
  );
}

function ContentPanel() {
  return (
    <div className={styles.panelStage}>
      <div className={`${styles.panelMedia} ${styles.productMedia}`}>
        <Image
          src={homePage.subscription.visual.src}
          alt="놀이체육 프로그램 썸네일이 보이는 실제 수업자료 화면"
          fill
          sizes="(min-width: 960px) 92vw, 100vw"
          style={{ objectFit: 'cover', objectPosition: homePage.subscription.visual.libraryCrop }}
        />
      </div>
      <div className={`${styles.panelCopy} ${styles.panelCopyOnLight}`}>
        <p>CONTENT</p>
        <h3>현장에서 필요한 프로그램을 직접 만듭니다.</h3>
        <ArrowLink href={homePage.spomove.primaryCta.href} trackLabel={homePage.spomove.primaryCta.trackLabel}>SPOMOVE 자세히 보기</ArrowLink>
      </div>
    </div>
  );
}

function SystemPanel() {
  return (
    <div className={styles.panelStage}>
      <div className={`${styles.panelMedia} ${styles.productMedia}`}>
        <Image
          src={homePage.subscription.visual.src}
          alt={homePage.subscription.visual.alt}
          fill
          sizes="(min-width: 960px) 92vw, 100vw"
          style={{ objectFit: 'cover', objectPosition: homePage.subscription.visual.productCrop }}
        />
      </div>
      <div className={`${styles.panelCopy} ${styles.panelCopyOnLight}`}>
        <p>SYSTEM</p>
        <h3>수업자료와 SPOMOVE가 한 시스템에 있습니다.</h3>
        <ArrowLink href={homePage.subscription.primaryCta.href} trackLabel={homePage.subscription.primaryCta.trackLabel}>구독시스템 보기</ArrowLink>
      </div>
    </div>
  );
}

function NextRow({ n, title, desc, href, trackLabel }: { n: string; title: string; desc: string; href: string; trackLabel: string; label?: string }) {
  return (
    <TrackedLink href={href} trackLabel={trackLabel} className={`${styles.nextRow} ${brandFocusRing}`}>
      <span>{n}</span>
      <div>
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
      <Arrow />
    </TrackedLink>
  );
}

export default HomeEditorialLanding;
