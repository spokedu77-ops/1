/* eslint-disable @next/next/no-img-element -- editorial crops require explicit art direction. */
import Link from 'next/link';
import { contactPageContent } from '../../contact/contact-page-data';
import { FIELD_RECORD_CATALOG } from '../../data/field-records-catalog';
import { privatePage } from '../../data/private-page';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import { HOME_HERO_IMAGE, HOME_MASTER_VISUAL, HOME_SPOMOVE_VISUAL } from './home-web-assets';
import styles from './home-canonical.module.css';

const AUDIENCE_PATHS = [
  {
    eyebrow: 'FOR FAMILIES',
    title: '개인·소그룹 수업',
    body: '아이의 움직임과 참여 수준, 일정과 지역을 확인해 맞는 수업 방향을 안내합니다.',
    href: SPOKEDU_PATHS.private,
    cta: '수업 방식 확인하기',
    image: '/images/spokedu/private/private-coaching.jpg',
    position: '50% 48%',
  },
  {
    eyebrow: 'FOR SCHOOLS & ORGANIZATIONS',
    title: '기관·학교 수업',
    body: '대상, 인원, 공간과 운영 목적에 맞춰 정규수업부터 특강·행사까지 설계합니다.',
    href: SPOKEDU_PATHS.education,
    cta: '기관 수업 살펴보기',
    image: '/images/spokedu/dispatch/dispatch-institution-class.jpg',
    position: '50% 50%',
  },
  {
    eyebrow: 'FOR EDUCATORS',
    title: 'SPOKEDU LAB',
    body: '지도자가 수업 콘텐츠를 찾고 준비하며 수업반·일정·출석·기록을 운영하는 서비스입니다.',
    href: SPOKEDU_PATHS.subscription,
    cta: 'LAB 기능과 요금 보기',
    image: HOME_MASTER_VISUAL.src,
    position: '50% 0%',
    product: true,
  },
] as const;

const FEATURED_RECORDS = FIELD_RECORD_CATALOG.slice(0, 5);

export function HomeWebLanding() {
  const instructors = privatePage.instructors.items;

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-heading">
        <img className={styles.heroImage} src={HOME_HERO_IMAGE.src} alt={HOME_HERO_IMAGE.alt} style={{ objectPosition: HOME_HERO_IMAGE.objectPosition }} />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroInner}>
          <p className={styles.heroEyebrow}>CHILD &amp; YOUTH PHYSICAL EDUCATION</p>
          <h1 id="home-heading">아이의 움직임을<br />교육의 경험으로 만듭니다.</h1>
          <p className={styles.heroLead}>전문 지도자가 학교·기관과 개인 수업을 직접 설계하고 운영합니다. 현장의 경험은 SPOMOVE와 SPOKEDU LAB으로 이어집니다.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="#audience">필요한 수업 찾기</Link>
            <Link className={styles.lightButton} href={`${SPOKEDU_PATHS.contact}?type=dispatch`}>수업 상담하기</Link>
          </div>
        </div>
      </section>

      <section id="audience" className={styles.audience} aria-labelledby="audience-heading">
        <header className={styles.sectionIntro}>
          <p className={styles.eyebrow}>CHOOSE YOUR PATH</p>
          <h2 id="audience-heading">지금 필요한 교육 경험을 선택하세요.</h2>
        </header>
        <div className={styles.audienceGrid}>
          {AUDIENCE_PATHS.map((item, index) => (
            <Link key={item.title} href={item.href} className={`${styles.audienceItem} ${index === 1 ? styles.audiencePrimary : ''}`}>
              <figure className={`${styles.audienceMedia} ${'product' in item && item.product ? styles.productMedia : ''}`}>
                <img src={item.image} alt="" style={{ objectPosition: item.position }} />
              </figure>
              <div className={styles.audienceCopy}>
                <span>{item.eyebrow}</span><h3>{item.title}</h3><p>{item.body}</p><strong>{item.cta} →</strong>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.expertise} aria-labelledby="expertise-heading">
        <div className={styles.expertiseInner}>
          <header className={styles.expertiseIntro}>
            <p className={styles.eyebrow}>PEOPLE BEHIND THE CLASS</p>
            <h2 id="expertise-heading">수업을 설계한 사람이<br />현장을 책임집니다.</h2>
            <p>체육교육 전공 운영진이 수업 기준을 만들고, 대상과 현장 조건을 확인해 프로그램과 지도자를 연결합니다.</p>
            <Link href={SPOKEDU_PATHS.about}>SPOKEDU 운영 기준 보기 →</Link>
          </header>
          <div className={styles.peopleGrid}>
            {instructors.map((person, index) => (
              <article key={person.name} className={`${styles.person} ${index === 0 ? styles.personLead : ''}`}>
                <img src={person.photo} alt={`${person.name} 운영진`} />
                <div><span>{person.name}</span><strong>{person.degree}</strong><ul>{person.badges.slice(0, 2).map((badge) => <li key={badge}>{badge}</li>)}</ul></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.records} aria-labelledby="records-heading">
        <div className={styles.recordsInner}>
          <header className={styles.recordsHead}>
            <div><p className={styles.eyebrow}>FIELD RECORDS</p><h2 id="records-heading">서로 다른 현장에<br />서로 다른 수업을 설계합니다.</h2></div>
            <Link href={SPOKEDU_PATHS.records}>전체 수업사례 보기 →</Link>
          </header>
          <div className={styles.recordsGrid}>
            {FEATURED_RECORDS.map((record, index) => {
              const content = <><img src={record.thumbnailSrc ?? `/images/spokedu/records/${record.slug}.jpg`} alt={`${record.venue} ${record.programLabel} 수업 현장`} /><span className={styles.recordShade} /><span className={styles.recordCopy}><small>{record.operationType} · {record.programLabel}</small><strong>{record.venue}</strong><em>{record.meta}</em></span></>;
              const className = `${styles.record} ${index === 0 ? styles.recordLead : ''}`;
              return record.href.startsWith('http') ? <a key={record.slug} href={record.href} target="_blank" rel="noreferrer" className={className}>{content}</a> : <Link key={record.slug} href={record.href} className={className}>{content}</Link>;
            })}
          </div>
        </div>
      </section>

      <section className={styles.products} aria-labelledby="products-heading">
        <div className={styles.productsInner}>
          <header className={styles.productHeading}><p className={styles.eyebrow}>FROM FIELD TO PRODUCT</p><h2 id="products-heading">현장의 수업 경험을<br />움직임과 운영 도구로 확장합니다.</h2></header>
          <article className={styles.spomoveFeature}>
            <figure><img src={HOME_SPOMOVE_VISUAL.src} alt={HOME_SPOMOVE_VISUAL.alt} style={{ objectPosition: HOME_SPOMOVE_VISUAL.objectPosition }} /></figure>
            <div><span>SPOMOVE</span><h3>보고, 판단하고,<br />몸으로 반응합니다.</h3><p>화면의 색·위치·방향 신호를 확인하고 SPOMAT 또는 수업 공간에서 움직임으로 반응하는 체육 프로그램입니다.</p><div className={styles.inlineLinks}><Link href={SPOKEDU_PATHS.spomove}>SPOMOVE 알아보기 →</Link><Link href={SPOKEDU_PATHS.spomat}>SPOMAT 보기 →</Link></div></div>
          </article>
          <article className={styles.labFeature}>
            <div><span>SPOKEDU LAB</span><h3>수업을 찾고 준비하고,<br />현장을 운영합니다.</h3><p>놀이체육 콘텐츠 탐색부터 수업반·일정·출석·기록까지 지도자의 실제 수업 흐름을 연결합니다. 이용 범위는 요금제에 따라 다릅니다.</p><Link href={SPOKEDU_PATHS.subscription}>기능과 요금제 확인하기 →</Link></div>
            <figure><img src={HOME_MASTER_VISUAL.src} alt={HOME_MASTER_VISUAL.alt} /></figure>
          </article>
        </div>
      </section>

      <section className={styles.consult} aria-labelledby="consult-heading">
        <div className={styles.consultInner}>
          <p className={styles.eyebrow}>LET&apos;S TALK</p><h2 id="consult-heading">수업에 대해 궁금하신가요?</h2><p>대상과 공간, 일정에 맞는 상담 경로를 선택해 주세요.</p>
          <div className={styles.consultLinks}>
            <Link href={`${SPOKEDU_PATHS.contact}?type=dispatch`}>기관 체육수업 문의</Link>
            <Link href={`${SPOKEDU_PATHS.contact}?type=private`}>개인·소그룹 수업 문의</Link>
            <a href={contactPageContent.kakaoChannelHref} target="_blank" rel="noreferrer">카카오톡 간편 문의 ↗</a>
          </div>
        </div>
      </section>
    </main>
  );
}
