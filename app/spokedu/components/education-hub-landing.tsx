'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { HOME_MEDIA } from '../data/home-media';
import { educationHubPage, type EducationHubCaseCard } from '../data/education-hub';
import { brandFocusRing, homePhotoGrade, koreanText, marketingButtonPrimaryOnDark, marketingHeroDisplay, marketingHeroDisplaySectionScale } from '../lib/ui-classes';
import { MediaPanel } from './visual';
import { TrackedLink } from './home/tracked-link';
import styles from './education-hub.module.css';

function TextCta({ href, trackLabel, children, dark = false }: { href: string; trackLabel: string; children: ReactNode; dark?: boolean }) {
  return <TrackedLink href={href} trackLabel={trackLabel} className={`${styles.textCta} ${dark ? styles.textCtaDark : ''} ${brandFocusRing}`}><span>{children}</span><span aria-hidden>→</span></TrackedLink>;
}

function FieldMedia({ mediaKey, caption }: { mediaKey: keyof typeof HOME_MEDIA; caption: string }) {
  return <figure className={styles.fieldFigure}><div className={styles.fieldPhoto}><MediaPanel media={HOME_MEDIA[mediaKey]} className={`${styles.mediaFill} border-0 ${homePhotoGrade}`} sizes="(min-width: 960px) 44vw, 92vw" objectFit="cover" /></div><figcaption>{caption}</figcaption></figure>;
}

export function EducationHubLanding() {
  const { hero, fit, operating, adjustment, cases, reviews, process, faq, contact } = educationHubPage;
  return <main className={styles.page} data-spokedu-education="institution-sales" data-spokedu-education-sections={educationHubPage.sectionOrder.length}>
    <section id={hero.id} className={styles.hero} aria-labelledby="education-hero-heading">
      <div className={styles.heroMedia}><MediaPanel media={HOME_MEDIA[hero.mediaKey]} className={`absolute inset-0 h-full w-full border-0 rounded-none ${homePhotoGrade}`} sizes="100vw" photoPriority priority objectFit="cover" /></div>
      <div className={styles.heroScrim} aria-hidden />
      <div className={styles.heroCopy}><div className={styles.contentRail}>
        <p className={styles.eyebrow}>{hero.eyebrow}</p>
        <h1 id="education-hero-heading" className={`${marketingHeroDisplay} ${marketingHeroDisplaySectionScale}`}><span>{hero.lines[0]}</span><span>{hero.lines[1]}</span></h1>
        <p className={`${styles.heroLead} ${koreanText}`}>{hero.lead}</p>
        <div className={styles.heroActions}><TrackedLink href={hero.primaryCta.href} trackLabel={hero.primaryCta.trackLabel} commercialRoute="dispatch" ctaIntentId={hero.primaryCta.trackLabel} className={`${marketingButtonPrimaryOnDark} ${brandFocusRing}`}>{hero.primaryCta.label}</TrackedLink><TextCta href={hero.secondaryCta.href} trackLabel={hero.secondaryCta.trackLabel} dark>{hero.secondaryCta.label}</TextCta></div>
      </div></div>
    </section>

    <section id={fit.id} className={styles.fit} aria-labelledby="education-fit-heading"><div className={styles.contentRail}>
      <header className={styles.sectionHeader}><h2 id="education-fit-heading" className={styles.sectionTitle}>{fit.title}</h2><p className={`${styles.sectionLead} ${koreanText}`}>{fit.lead}</p></header>
      <ul className={styles.fitGrid}>{fit.items.map(item => <li key={item.label}><p className={styles.meta}>{item.label}</p><h3>{item.condition}</h3><p>{item.response}</p>{item.label === '공간' ? <small>{fit.smallSpace}</small> : null}</li>)}</ul>
      <p className={styles.institutionLine}><strong>적합 기관</strong><span>{fit.institutions}</span></p>
    </div></section>

    <section id={operating.id} className={styles.operating} aria-labelledby="education-operating-heading"><div className={styles.contentRail}>
      <header className={styles.sectionHeader}><h2 id="education-operating-heading" className={styles.sectionTitle}>{operating.title}</h2><p className={`${styles.sectionLead} ${koreanText}`}>{operating.lead}</p></header>
      <div className={styles.formatGrid}>{operating.formats.map(format => <article key={format.title}><h3>{format.title}</h3><p>{format.body}</p><small>{format.example}</small></article>)}</div>
    </div><div className={styles.visualRail}><div className={styles.fieldPair}>{operating.fieldMedia.map(item => <FieldMedia key={item.mediaKey} {...item} />)}</div></div>
    <div className={styles.contentRail}><div className={styles.lineupIntro}><h3>기관 목적에 따라 조합하는 운영 콘텐츠</h3><p>하나를 상품처럼 고르는 목록이 아니라, 대상과 운영 목적에 맞춰 수업 안에 조합하는 범위입니다.</p></div><ul className={styles.lineupList}>{operating.lineup.map(item => <li key={item.name}><h4>{item.name}</h4><p>{item.description}</p><small>{item.use}</small></li>)}</ul></div>
    <div className={styles.visualRail}><div className={styles.spomoveProof}><div className={styles.spomovePhoto}><Image src="/images/spokedu/home/field-editorial/home-spomove-field.webp" alt="SPOMOVE 화면을 보며 지도자와 아이들이 함께 움직이는 기관수업 현장" fill className={styles.directPhoto} sizes="(min-width: 960px) 58vw, 92vw" /></div><div><p className={styles.meta}>SPOMOVE · 현장 활용</p><h3>{operating.spomove.title}</h3><p>{operating.spomove.body}</p><small>{operating.spomove.note}</small></div></div></div>
    </section>

    <section id={adjustment.id} className={styles.adjustment} aria-labelledby="education-adjustment-heading"><div className={styles.contentRail}><header className={styles.sectionHeader}><h2 id="education-adjustment-heading" className={styles.sectionTitle}>{adjustment.title}</h2><p className={styles.sectionLead}>{adjustment.lead}</p></header><ul className={styles.mechanism}>{adjustment.items.map(item => <li key={item.label}><h3>{item.label}</h3><p>{item.body}</p></li>)}</ul></div></section>

    <section id={cases.id} className={styles.cases} aria-labelledby="education-cases-heading"><div className={styles.contentRail}><header className={styles.sectionHeader}><h2 id="education-cases-heading" className={styles.sectionTitle}>{cases.title}</h2><p className={styles.sectionLead}>{cases.lead}</p></header><ul className={styles.caseGrid}>{cases.cards.map(card => <li key={card.slug}><CaseItem card={card} /></li>)}</ul></div></section>

    <section id={reviews.id} className={styles.reviews} aria-labelledby="education-reviews-heading"><div className={styles.contentRail}><h2 id="education-reviews-heading" className={styles.reviewTitle}>{reviews.title}</h2><ul>{reviews.items.map(item => <li key={item.meta}><p>{item.quote}</p><small>{item.meta}</small></li>)}</ul></div></section>

    <section id={process.id} className={styles.process} aria-labelledby="education-process-heading"><div className={styles.contentRail}><h2 id="education-process-heading" className={styles.sectionTitle}>{process.title}</h2><ol>{process.steps.map((step, index) => <li key={step.title}><span>{index < process.steps.length - 1 ? '→' : ''}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol><p className={styles.processNote}>{process.note}</p></div></section>

    <section id={faq.id} className={styles.faq} aria-labelledby="education-faq-heading"><div className={styles.contentRail}><h2 id="education-faq-heading" className={styles.sectionTitle}>{faq.title}</h2><div className={styles.faqList}>{faq.items.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div></div></section>

    <section id={contact.id} className={styles.contact} aria-labelledby="education-contact-heading"><div className={styles.contentRail}><div><h2 id="education-contact-heading" className={styles.sectionTitle}>{contact.title}</h2><p>{contact.lead}</p></div><TrackedLink href={contact.primaryCta.href} trackLabel={contact.primaryCta.trackLabel} commercialRoute="dispatch" ctaIntentId={contact.primaryCta.trackLabel} className={`${styles.contactButton} ${brandFocusRing}`}>{contact.primaryCta.label}</TrackedLink></div></section>
  </main>;
}

function CaseItem({ card }: { card: EducationHubCaseCard }) {
  return <TrackedLink href={card.href} trackLabel={card.trackLabel} className={`${styles.caseLink} ${brandFocusRing}`}><article><div className={styles.casePhoto}><Image src={card.thumbnailSrc} alt={`${card.venue} ${card.context} 수업 현장`} fill className={styles.directPhoto} style={{ objectPosition: card.objectPosition }} sizes="(min-width: 960px) 30vw, 92vw" /></div><div className={styles.caseMeta}><h3>{card.venue}</h3><p>{card.context}</p><small>{card.description}</small></div></article></TrackedLink>;
}
