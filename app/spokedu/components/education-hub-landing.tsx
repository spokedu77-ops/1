'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { HOME_MEDIA } from '../data/home-media';
import { educationHubPage, type EducationHubCaseCard } from '../data/education-hub';
import {
  brandFocusRing,
  homePhotoGrade,
  koreanBody,
  koreanDisplay,
  marketingButtonPrimaryOnDark,
  marketingHeroDisplay,
  marketingHeroDisplaySectionScale,
} from '../lib/ui-classes';
import { MediaPanel } from './visual';
import { TrackedLink } from './home/tracked-link';
import styles from './education-hub.module.css';

type ProgramFamily = {
  id: string;
  title: string;
  description: string;
  meta: string;
  image: string | null;
  intro: string;
  recommendedFor: readonly string[];
  activities: readonly string[];
  formats: readonly string[];
};

const PROGRAM_FAMILIES: readonly ProgramFamily[] = [
  {
    id: 'functional-move',
    title: '펑셔널 무브',
    description: '기본 움직임을 수업의 바탕으로 구성합니다.',
    meta: '정기수업 · 기초 활동',
    image: null,
    intro: '기본 움직임을 바탕으로 수업의 기초 체력과 움직임 경험을 구성합니다.',
    recommendedFor: ['정기 체육수업', '저학년 및 입문 단계', '기초 움직임 경험이 필요한 그룹'],
    activities: ['이동운동기술', '균형', '협응', '기초 조작활동'],
    formats: ['정기수업', '단회 특강'],
  },
  {
    id: 'teambuilding',
    title: '팀빌딩',
    description: '협동 미션과 규칙 있는 팀 활동을 조합합니다.',
    meta: '단회 · 관계 형성 · 캠프',
    image: null,
    intro: '협동 미션과 규칙 있는 팀 활동을 통해 관계 형성과 협업 경험을 설계합니다.',
    recommendedFor: ['학급 관계 형성', '캠프', '원데이 프로그램', '기관 행사'],
    activities: ['협동 이동', '팀 미션', '전략 게임', '공동 목표 활동'],
    formats: ['단회', '특강', '행사'],
  },
  {
    id: 'spomove',
    title: 'SPOMOVE',
    description: '화면의 정보를 보고 판단한 뒤 움직임으로 반응합니다.',
    meta: '워밍업 · 반응형 활동',
    image: null,
    intro: '화면의 정보를 보고 판단한 뒤 움직임으로 반응하는 디지털 신체활동입니다.',
    recommendedFor: ['수업 워밍업', '시지각 반응 활동', '집중 및 선택 반응 과제', '수업 전환 활동'],
    activities: ['색상/방향 자극', '시지각 반응', '선택 반응', '인지-움직임 연결'],
    formats: ['정기수업', '프로그램 확장', '체험형 활동'],
  },
  {
    id: 'monthly-sports',
    title: '월간 스포츠',
    description: '스포츠와 뉴스포츠 종목을 회기별 테마로 구성합니다.',
    meta: '정기수업 · 방과후',
    image: null,
    intro: '스포츠와 뉴스포츠 종목을 회기별 테마로 구성해 다양한 종목 경험을 제공합니다.',
    recommendedFor: ['정기수업', '방과후', '종목 경험 확대', '시즌형 프로그램'],
    activities: ['뉴스포츠', '구기 종목', '라켓 스포츠', '시즌별 스포츠'],
    formats: ['정기수업', '방과후', '월간 테마'],
  },
  {
    id: 'mini-olympics',
    title: '미니올림픽',
    description: '여러 종목을 팀 경쟁과 응원 흐름으로 연결합니다.',
    meta: '행사 · 스페셜 클래스',
    image: null,
    intro: '여러 종목을 팀 경쟁과 응원 흐름으로 연결해 하나의 스포츠 이벤트로 구성합니다.',
    recommendedFor: ['기관 행사', '캠프', '학급 이벤트', '특별수업'],
    activities: ['팀별 종목', '릴레이', '협동 경기', '기록형 경기'],
    formats: ['행사', '스페셜 클래스', '원데이'],
  },
  {
    id: 'custom-booth',
    title: '체험·부스·커스텀',
    description: '기관 목적과 동선에 맞춰 체험 단위를 새로 조합합니다.',
    meta: '축제 · 공공행사',
    image: null,
    intro: '기관의 목적과 동선에 맞춰 체험 단위와 프로그램을 새롭게 조합합니다.',
    recommendedFor: ['축제', '박람회', '공공행사', '체험부스'],
    activities: ['체험형 스포츠', '순환형 활동', 'SPOMOVE', '기관 맞춤 콘텐츠'],
    formats: ['부스', '행사', '커스텀 프로그램'],
  },
];

function TextCta({
  href,
  trackLabel,
  children,
  dark = false,
}: {
  href: string;
  trackLabel: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <TrackedLink
      href={href}
      trackLabel={trackLabel}
      className={`${styles.textCta} ${dark ? styles.textCtaDark : ''} ${brandFocusRing} ${koreanDisplay}`}
    >
      <span className={styles.textCtaLabel}>{children}</span>
      <span className={styles.textCtaArrow} aria-hidden>
        →
      </span>
    </TrackedLink>
  );
}

function FieldMedia({ mediaKey, caption }: { mediaKey: keyof typeof HOME_MEDIA; caption: string }) {
  return (
    <figure className={styles.fieldFigure}>
      <div className={styles.fieldPhoto}>
        <MediaPanel
          media={HOME_MEDIA[mediaKey]}
          className={`${styles.mediaFill} border-0 ${homePhotoGrade}`}
          sizes="(min-width: 960px) 44vw, 92vw"
          objectFit="cover"
        />
      </div>
      <figcaption className={koreanBody}>{caption}</figcaption>
    </figure>
  );
}

export function EducationHubLanding() {
  const { hero, fit, operating, adjustment, cases, reviews, process, faq, contact } = educationHubPage;
  const [selectedProgram, setSelectedProgram] = useState<ProgramFamily | null>(null);
  const closeProgramDetail = useCallback(() => setSelectedProgram(null), []);

  return (
    <main
      className={styles.page}
      data-spokedu-education="institution-sales"
      data-spokedu-education-sections={educationHubPage.sectionOrder.length}
    >
      <section id={hero.id} className={styles.hero} aria-labelledby="education-hero-heading">
        <div className={styles.heroMedia}>
          <MediaPanel
            media={HOME_MEDIA[hero.mediaKey]}
            className={`absolute inset-0 h-full w-full border-0 rounded-none ${homePhotoGrade}`}
            sizes="100vw"
            photoPriority
            priority
            objectFit="cover"
          />
        </div>
        <div className={styles.heroScrim} aria-hidden />
        <div className={styles.heroCopy}>
          <div className={styles.contentRail}>
            <p className={`${styles.eyebrow} ${koreanDisplay}`}>{hero.eyebrow}</p>
            <h1
              id="education-hero-heading"
              className={`${marketingHeroDisplay} ${marketingHeroDisplaySectionScale} ${koreanDisplay}`}
            >
              <span>{hero.lines[0]}</span>
              <span>{hero.lines[1]}</span>
            </h1>
            <p className={`${styles.heroLead} ${koreanBody}`}>{hero.lead}</p>
            <div className={styles.heroActions}>
              <TrackedLink
                href={hero.primaryCta.href}
                trackLabel={hero.primaryCta.trackLabel}
                commercialRoute="dispatch"
                ctaIntentId={hero.primaryCta.trackLabel}
                className={`${marketingButtonPrimaryOnDark} ${brandFocusRing} ${koreanDisplay}`}
              >
                {hero.primaryCta.label}
              </TrackedLink>
              <TextCta href={hero.secondaryCta.href} trackLabel={hero.secondaryCta.trackLabel} dark>
                {hero.secondaryCta.label}
              </TextCta>
            </div>
          </div>
        </div>
      </section>

      <section id={fit.id} className={styles.fit} aria-labelledby="education-fit-heading">
        <div className={styles.contentRail}>
          <header className={`${styles.sectionHeader} ${styles.sectionReveal}`}>
            <h2 id="education-fit-heading" className={`${styles.sectionTitle} ${koreanDisplay}`}>
              {fit.title}
            </h2>
            <p className={`${styles.sectionLead} ${koreanBody}`}>{fit.lead}</p>
          </header>
          <ul className={styles.fitGrid}>
            {fit.items.map((item) => (
              <li key={item.label}>
                <p className={`${styles.meta} ${koreanBody}`}>{item.label}</p>
                <h3 className={koreanDisplay}>{item.condition}</h3>
                <p className={koreanBody}>{item.response}</p>
              </li>
            ))}
          </ul>
          <p className={`${styles.institutionLine} ${koreanBody}`}>
            <strong className={koreanDisplay}>적합 기관</strong>
            <span>{fit.institutions}</span>
          </p>
        </div>
      </section>

      <section id={operating.id} className={styles.operating} aria-labelledby="education-operating-heading">
        <div className={styles.contentRail}>
          <header className={`${styles.sectionHeader} ${styles.sectionReveal}`}>
            <h2 id="education-operating-heading" className={`${styles.sectionTitle} ${koreanDisplay}`}>
              {operating.title}
            </h2>
            <p className={`${styles.sectionLead} ${koreanBody}`}>{operating.lead}</p>
          </header>
          <div className={styles.formatGrid}>
            {operating.formats.map((format) => (
              <article key={format.title}>
                <h3 className={koreanDisplay}>{format.title}</h3>
                <p className={koreanBody}>{format.body}</p>
                <small className={koreanBody}>{format.example}</small>
              </article>
            ))}
          </div>
        </div>
        <div className={styles.visualRail}>
          <div className={`${styles.fieldPair} ${styles.sectionReveal}`}>
            {operating.fieldMedia.map((item) => (
              <FieldMedia key={item.mediaKey} {...item} />
            ))}
          </div>
        </div>
        <div className={styles.contentRail}>
          <div className={styles.lineupIntro}>
            <h3 className={koreanDisplay}>기관 목적에 따라 조합하는 운영 콘텐츠</h3>
            <p className={koreanBody}>
              정규 수업부터 행사·체험까지, 대상과 운영 목적에 맞춰 프로그램을 조합합니다.
            </p>
          </div>
          <ul className={styles.programGrid}>
            {PROGRAM_FAMILIES.map((program) => (
              <li key={program.id}>
                <ProgramCard program={program} onSelect={setSelectedProgram} />
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.visualRail}>
          <div className={styles.spomoveProof}>
            <div className={styles.spomovePhoto}>
              <Image
                src="/images/spokedu/home/field-editorial/home-spomove-field.webp"
                alt="SPOMOVE 화면을 보며 지도자와 아이들이 함께 움직이는 기관수업 현장"
                fill
                className={styles.directPhoto}
                sizes="(min-width: 960px) 58vw, 92vw"
              />
            </div>
            <div>
              <p className={`${styles.meta} ${koreanDisplay}`}>SPOMOVE · 현장 활용</p>
              <h3 className={koreanDisplay}>{operating.spomove.title}</h3>
              <p className={koreanBody}>{operating.spomove.body}</p>
              <small className={koreanBody}>{operating.spomove.note}</small>
            </div>
          </div>
        </div>
      </section>

      <section id={adjustment.id} className={styles.adjustment} aria-labelledby="education-adjustment-heading">
        <div className={styles.contentRail}>
          <header className={`${styles.sectionHeader} ${styles.sectionReveal}`}>
            <h2 id="education-adjustment-heading" className={`${styles.sectionTitle} ${koreanDisplay}`}>
              {adjustment.title}
            </h2>
            <p className={`${styles.sectionLead} ${koreanBody}`}>{adjustment.lead}</p>
          </header>
          <ul className={styles.mechanism}>
            {adjustment.items.map((item) => (
              <li key={item.label}>
                <h3 className={koreanDisplay}>{item.label}</h3>
                <p className={koreanBody}>{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={cases.id} className={styles.cases} aria-labelledby="education-cases-heading">
        <div className={styles.contentRail}>
          <header className={`${styles.sectionHeader} ${styles.sectionReveal}`}>
            <h2 id="education-cases-heading" className={`${styles.sectionTitle} ${koreanDisplay}`}>
              {cases.title}
            </h2>
            <p className={`${styles.sectionLead} ${koreanBody}`}>{cases.lead}</p>
          </header>
          <ul className={`${styles.caseGrid} ${styles.sectionReveal}`}>
            {cases.cards.map((card) => (
              <li key={card.slug}>
                <CaseItem card={card} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={reviews.id} className={styles.reviews} aria-labelledby="education-reviews-heading">
        <div className={styles.contentRail}>
          <h2 id="education-reviews-heading" className={`${styles.reviewTitle} ${styles.sectionReveal} ${koreanDisplay}`}>
            {reviews.title}
          </h2>
          <ul>
            {reviews.items.map((item) => (
              <li key={item.meta}>
                <p className={koreanBody}>{item.quote}</p>
                <small className={koreanBody}>{item.meta}</small>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id={process.id} className={styles.process} aria-labelledby="education-process-heading">
        <div className={styles.contentRail}>
          <h2 id="education-process-heading" className={`${styles.sectionTitle} ${koreanDisplay}`}>
            {process.title}
          </h2>
          <ol>
            {process.steps.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden>{index < process.steps.length - 1 ? '→' : ''}</span>
                <h3 className={koreanDisplay}>{step.title}</h3>
                <p className={koreanBody}>{step.body}</p>
              </li>
            ))}
          </ol>
          <p className={`${styles.processNote} ${koreanBody}`}>{process.note}</p>
        </div>
      </section>

      <section id={faq.id} className={styles.faq} aria-labelledby="education-faq-heading">
        <div className={styles.contentRail}>
          <h2 id="education-faq-heading" className={`${styles.sectionTitle} ${koreanDisplay}`}>
            {faq.title}
          </h2>
          <div className={styles.faqList}>
            {faq.items.map((item) => (
              <details key={item.q}>
                <summary className={koreanDisplay}>{item.q}</summary>
                <p className={koreanBody}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id={contact.id} className={styles.contact} aria-labelledby="education-contact-heading">
        <div className={styles.contentRail}>
          <div>
            <h2 id="education-contact-heading" className={`${styles.sectionTitle} ${koreanDisplay}`}>
              {contact.title}
            </h2>
            <p className={koreanBody}>{contact.lead}</p>
          </div>
          <TrackedLink
            href={contact.primaryCta.href}
            trackLabel={contact.primaryCta.trackLabel}
            commercialRoute="dispatch"
            ctaIntentId={contact.primaryCta.trackLabel}
            className={`${styles.contactButton} ${brandFocusRing} ${koreanDisplay}`}
          >
            {contact.primaryCta.label}
          </TrackedLink>
        </div>
      </section>
      {selectedProgram ? (
        <ProgramDetailModal program={selectedProgram} onClose={closeProgramDetail} />
      ) : null}
    </main>
  );
}

function ProgramMedia({ program, sizes }: { program: ProgramFamily; sizes: string }) {
  if (program.image) {
    return (
      <Image
        src={program.image}
        alt=""
        fill
        className={styles.programMediaImage}
        sizes={sizes}
      />
    );
  }

  return <span className={styles.programMediaFallback}>대표 이미지</span>;
}

function ProgramCard({
  program,
  onSelect,
}: {
  program: ProgramFamily;
  onSelect: (program: ProgramFamily) => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.programCard} ${brandFocusRing} ${koreanDisplay}`}
      onClick={() => onSelect(program)}
    >
      <span className={styles.programMedia}>
        <ProgramMedia program={program} sizes="(min-width: 1100px) 22vw, (min-width: 640px) 44vw, 92vw" />
      </span>
      <span className={styles.programCardBody}>
        <span className={`${styles.programCardTitle} ${koreanDisplay}`}>{program.title}</span>
        <span className={`${styles.programCardDescription} ${koreanBody}`}>{program.description}</span>
        <span className={`${styles.programCardMeta} ${koreanBody}`}>{program.meta}</span>
        <span className={`${styles.programCardAction} ${koreanDisplay}`} aria-hidden>
          자세히 보기 →
        </span>
      </span>
    </button>
  );
}

function ProgramDetailModal({
  program,
  onClose,
}: {
  program: ProgramFamily;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [onClose]);

  return (
    <div className={styles.programModalBackdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.programModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className={`${styles.programModalClose} ${brandFocusRing}`}
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
        <div className={styles.programModalMedia}>
          <ProgramMedia program={program} sizes="(min-width: 760px) 720px, 92vw" />
        </div>
        <div className={styles.programModalBody}>
          <h3 id={titleId} className={`${styles.programModalTitle} ${koreanDisplay}`}>
            {program.title}
          </h3>
          <p className={`${styles.programModalIntro} ${koreanBody}`}>{program.intro}</p>
          <div className={styles.programModalSection}>
            <h4 className={`${styles.programModalHeading} ${koreanDisplay}`}>추천 상황</h4>
            <ul className={koreanBody}>
              {program.recommendedFor.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className={styles.programModalSection}>
            <h4 className={`${styles.programModalHeading} ${koreanDisplay}`}>활동 구성</h4>
            <ul className={koreanBody}>
              {program.activities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className={styles.programModalSection}>
            <h4 className={`${styles.programModalHeading} ${koreanDisplay}`}>운영 형태</h4>
            <ul className={koreanBody}>
              {program.formats.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            className={`${styles.programModalDismiss} ${brandFocusRing} ${koreanDisplay}`}
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function CaseItem({ card }: { card: EducationHubCaseCard }) {
  return (
    <TrackedLink href={card.href} trackLabel={card.trackLabel} className={`${styles.caseLink} ${brandFocusRing}`}>
      <article>
        <div className={styles.casePhoto}>
          <Image
            src={card.thumbnailSrc}
            alt={`${card.venue} ${card.context} 수업 현장`}
            fill
            className={styles.directPhoto}
            style={{ objectPosition: card.objectPosition }}
            sizes="(min-width: 960px) 30vw, 92vw"
          />
        </div>
        <div className={styles.caseMeta}>
          <h3 className={koreanDisplay}>{card.venue}</h3>
          <p className={koreanBody}>{card.context}</p>
          <small className={koreanBody}>{card.description}</small>
        </div>
      </article>
    </TrackedLink>
  );
}
