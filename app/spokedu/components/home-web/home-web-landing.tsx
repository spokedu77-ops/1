/* eslint-disable @next/next/no-img-element -- editorial crops require explicit art direction. */
import Link from 'next/link';
import { contactPageContent } from '../../contact/contact-page-data';
import { getFieldRecordCatalogItem, type FieldRecordSlug } from '../../data/field-records-catalog';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import { HOME_HERO_IMAGE, HOME_MASTER_VISUAL, HOME_SPOMOVE_VISUAL } from './home-web-assets';
import { HOME_SECTION03_EVIDENCE, HOME_SECTION03_PEOPLE } from './home-section03-people';
import styles from './home-canonical.module.css';

const AUDIENCE_PATHS = [
  {
    eyebrow: '01 · PERSONAL CLASS',
    title: '개인·소그룹 수업',
    body: '아이의 움직임 수준과 목표에 맞춰 진행하는 맞춤형 체육수업',
    href: SPOKEDU_PATHS.private,
    cta: '개인수업 알아보기',
    image: '/images/spokedu/home/customer-purpose/personal-mentoring.webp',
    alt: '야외 체육수업에서 지도자가 아동의 동작을 가까이에서 안내하는 모습',
    position: '50% 57%',
  },
  {
    eyebrow: '02 · SCHOOL & ORGANIZATION',
    title: '기관·학교 수업',
    body: '학교와 기관의 환경에 맞춰 운영하는 전문 체육교육',
    href: SPOKEDU_PATHS.education,
    cta: '기관수업 알아보기',
    image: '/images/spokedu/home/customer-purpose/institution-group-jumprope.webp',
    alt: '복지관 체육수업에서 지도자와 여러 아동이 함께 줄넘기 활동을 하는 모습',
    position: '48% 50%',
  },
  {
    eyebrow: '03 · FOR EDUCATORS',
    title: 'SPOKEDU LAB',
    body: '체육 지도자를 위한 수업 콘텐츠와 운영 도구',
    href: SPOKEDU_PATHS.subscription,
    cta: 'LAB 둘러보기',
    image: '/images/spokedu/home/field-editorial/home-master-ui.png',
    alt: '이어서 준비할 수업과 추천 프로그램을 보여주는 SPOKEDU LAB 홈 화면',
    position: '50% 0%',
    product: true,
  },
] as const;

const HOME_SECTION04_RECORDS = [
  { slug: 'donghaeng-special-pe', objectPosition: '58% 50%' },
  { slug: 'maedong-sports-stepup', objectPosition: '50% 50%' },
  { slug: 'yangcheon-paps', objectPosition: '50% 50%' },
  { slug: 'dasarang-oneday', objectPosition: '50% 50%' },
  { slug: 'seodaemun-event-booth', objectPosition: '50% 50%' },
] as const satisfies readonly { slug: FieldRecordSlug; objectPosition: string }[];

const FEATURED_RECORDS = HOME_SECTION04_RECORDS.map(({ slug, objectPosition }) => ({
  ...getFieldRecordCatalogItem(slug),
  objectPosition,
}));

export function HomeWebLanding() {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-heading">
        <img className={styles.heroImage} src={HOME_HERO_IMAGE.src} alt={HOME_HERO_IMAGE.alt} style={{ objectPosition: HOME_HERO_IMAGE.objectPosition }} />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroInner}>
          <p className={styles.heroEyebrow}>CHILD &amp; YOUTH PHYSICAL EDUCATION</p>
          <h1 id="home-heading"><span>아이의 움직임을</span><span>교육의 경험으로 만듭니다.</span></h1>
          <p className={styles.heroLead}><span>전문 지도자가 학교·기관과 개인 수업을 직접 설계하고 운영합니다.</span><span>현장의 경험은 SPOMOVE와 SPOKEDU LAB으로 이어집니다.</span></p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="#audience">필요한 수업 찾기</Link>
            <Link className={styles.lightButton} href={`${SPOKEDU_PATHS.contact}?type=dispatch`}>수업 상담하기</Link>
          </div>
        </div>
      </section>

      <section id="audience" className={styles.audience} aria-labelledby="audience-heading">
        <header className={styles.sectionIntro}>
          <p className={styles.eyebrow}>02 · CHOOSE YOUR PATH</p>
          <h2 id="audience-heading">어떤 수업을 찾고 계신가요?</h2>
        </header>
        <div className={styles.audienceGrid}>
          {AUDIENCE_PATHS.map((item, index) => (
            <Link key={item.title} href={item.href} className={`${styles.audienceItem} ${index === 0 ? styles.audiencePersonal : index === 1 ? styles.audienceInstitution : styles.audienceLab}`}>
              <figure className={`${styles.audienceMedia} ${'product' in item && item.product ? styles.productMedia : ''}`}>
                <img src={item.image} alt={item.alt} style={{ objectPosition: item.position }} />
              </figure>
              <div className={styles.audienceCopy}>
                <span>{item.eyebrow}</span><h3>{item.title}</h3><p>{item.body}</p><strong>{item.cta}<span aria-hidden="true">→</span></strong>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.expertise} aria-labelledby="expertise-heading">
        <div className={styles.expertiseInner}>
          <header className={styles.expertiseIntro}>
            <p className={styles.eyebrow}>PEOPLE &amp; EXPERTISE</p>
            <h2 id="expertise-heading">수업을 설계한 사람이<br />현장을 책임집니다.</h2>
            <p>체육교육 전문가가 수업의 기준을 만들고, 학교와 기관의 실제 현장에서 프로그램을 설계하고 운영합니다.</p>
          </header>
          <div className={styles.peopleGrid}>
            {HOME_SECTION03_PEOPLE.map((person, index) => (
              <article key={person.name} className={`${styles.person} ${index === 0 ? styles.personLead : ''}`}>
                <figure className={styles.personMedia}>
                  <img src={person.photo} alt={`${person.role} ${person.name}`} style={{ objectPosition: person.objectPosition }} />
                </figure>
                <div className={styles.personCopy}>
                  <div><span>{person.name}</span><p>{person.role}</p></div>
                  <ul>{person.credentials.map((credential) => <li key={credential}>{credential}</li>)}</ul>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.expertiseProof}>
            <p className={styles.expertiseProofTitle}>운영 전문성</p>
            <ul>
              {HOME_SECTION03_EVIDENCE.map((item, index) => (
                <li key={item}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong></li>
              ))}
            </ul>
            <Link href={SPOKEDU_PATHS.about}>SPOKEDU 소개 <span aria-hidden="true">→</span></Link>
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
              const content = <><figure className={styles.recordMedia}><img src={record.thumbnailSrc ?? `/images/spokedu/records/${record.slug}.jpg`} alt={`${record.venue} ${record.programLabel} 수업 현장`} style={{ objectPosition: record.objectPosition }} /><span className={styles.recordShade} /></figure><span className={styles.recordCopy}><small>{record.operationType} · {record.programLabel}</small><strong>{record.venue}</strong><em>{record.meta}</em></span></>;
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
          <p className={styles.eyebrow}>LET&apos;S TALK</p><h2 id="consult-heading"><span>수업에 대해</span>{' '}<span>궁금하신가요?</span></h2><p>대상과 공간, 일정에 맞는 상담 경로를 선택해 주세요.</p>
          <div className={styles.consultLinks}>
            <Link href={`${SPOKEDU_PATHS.contact}?type=dispatch`}>기관 체육수업 문의</Link>
            <Link href={`${SPOKEDU_PATHS.contact}?type=private`}>개인·소그룹 수업 문의</Link>
            <a href={contactPageContent.kakaoChannelHref} target="_blank" rel="noreferrer">카카오톡 간편 문의 ↗</a>
          </div>
        </div>
      </section>
    </div>
  );
}
