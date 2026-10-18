import Link from 'next/link';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import styles from './home-web.module.css';

const GATEWAY_CARDS = [
  {
<<<<<<< HEAD
    audience: '기관·학교 담당자',
    title: '기관·학교 체육수업',
    body: '학교와 기관의 환경과 대상에 맞춰 수업을 설계하고 운영합니다.',
    linkLabel: '기관 수업 안내',
=======
    id: 'education',
    accent: styles.gatewayAccentOrange,
    audience: '기관·학교 담당자',
    title: '기관·학교 체육수업',
    body: '학교와 기관의 환경과 대상에 맞춰 수업을 설계하고 운영합니다.',
    linkLabel: '기관 수업 안내 →',
>>>>>>> 5e263593f482ea85aa2c6b7bbd8e50e2df05e2cc
    href: SPOKEDU_PATHS.education,
    accentClass: styles.gatewayCardInstitution,
  },
  {
<<<<<<< HEAD
    audience: '학부모',
    title: '개인·소그룹 수업',
    body: '아이의 움직임과 참여 수준에 맞춰 수업을 진행합니다.',
    linkLabel: '개인 수업 안내',
=======
    id: 'private',
    accent: styles.gatewayAccentTeal,
    audience: '학부모',
    title: '개인·소그룹 수업',
    body: '아이의 움직임과 참여 수준에 맞춰 수업을 진행합니다.',
    linkLabel: '개인 수업 안내 →',
>>>>>>> 5e263593f482ea85aa2c6b7bbd8e50e2df05e2cc
    href: SPOKEDU_PATHS.private,
    accentClass: styles.gatewayCardPrivate,
  },
  {
<<<<<<< HEAD
    audience: '지도자·센터 운영자',
    title: 'SPOKEDU LAB',
    body: '수업 콘텐츠부터 운영과 기록까지 연결하는 지도자용 수업 시스템입니다.',
    linkLabel: 'LAB 둘러보기',
=======
    id: 'lab',
    accent: styles.gatewayAccentBlue,
    audience: '지도자·센터 운영자',
    title: 'SPOKEDU LAB',
    body: '수업 콘텐츠부터 운영과 기록까지 연결하는 지도자용 수업 시스템입니다.',
    linkLabel: 'LAB 둘러보기 →',
>>>>>>> 5e263593f482ea85aa2c6b7bbd8e50e2df05e2cc
    href: SPOKEDU_PATHS.subscription,
    accentClass: styles.gatewayCardLab,
  },
] as const;

<<<<<<< HEAD
/** Three equal service choices. Each card is one accessible link with no nested controls. */
=======
/** Phase 1-B1 — three equal cards, full-card links, no decorative step numbers. */
>>>>>>> 5e263593f482ea85aa2c6b7bbd8e50e2df05e2cc
export function ServiceGateway() {
  return (
    <section className={`${styles.section} ${styles.gateway}`} aria-labelledby="home-gateway-heading">
      <div className={styles.rail}>
<<<<<<< HEAD
        <div className={styles.gatewayHeader}>
          <p className={styles.eyebrow}>CHOOSE YOUR PATH</p>
          <h2 id="home-gateway-heading" className={styles.gatewayTitle}>
            필요한 서비스로 바로 이동하세요.
          </h2>
          <p className={styles.gatewayLead}>원하시는 수업이나 수업자료 서비스를 선택해 보세요.</p>
        </div>
        <div className={styles.gatewayCards}>
          {GATEWAY_CARDS.map((card) => (
            <Link key={card.title} href={card.href} className={`${styles.gatewayCard} ${card.accentClass}`}>
              <div className={styles.gatewayCardMain}>
                <p className={styles.gatewayAudience}>{card.audience}</p>
                <h3 className={styles.gatewayCardTitle}>{card.title}</h3>
                <p className={styles.gatewayCardBody}>{card.body}</p>
              </div>
              <div className={styles.gatewayCardLink}>
                <span>{card.linkLabel}</span>
                <span aria-hidden="true">→</span>
              </div>
=======
        <header className={styles.gatewayHead}>
          <p className={styles.eyebrow}>CHOOSE YOUR PATH</p>
          <h2 id="home-gateway-heading" className={styles.gatewayHeading}>
            필요한 서비스로 바로 이동하세요.
          </h2>
          <p className={styles.gatewayIntro}>원하시는 수업이나 수업자료 서비스를 선택해 보세요.</p>
        </header>
        <div className={styles.gatewayCards}>
          {GATEWAY_CARDS.map((card) => (
            <Link key={card.id} href={card.href} className={styles.gatewayCard}>
              <span className={`${styles.gatewayCardAccent} ${card.accent}`} aria-hidden="true" />
              <span className={styles.gatewayCardAudience}>{card.audience}</span>
              <strong className={styles.gatewayCardTitle}>{card.title}</strong>
              <p className={styles.gatewayCardBody}>{card.body}</p>
              <span className={styles.gatewayCardLink}>{card.linkLabel}</span>
>>>>>>> 5e263593f482ea85aa2c6b7bbd8e50e2df05e2cc
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
