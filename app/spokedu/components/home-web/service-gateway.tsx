import Link from 'next/link';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import styles from './home-web.module.css';

const GATEWAY_ROWS = [
  {
    index: '01',
    title: '기관·학교 체육수업',
    body: '학교와 기관의 환경과 대상에 맞춰 수업을 설계하고 운영합니다.',
    href: SPOKEDU_PATHS.education,
  },
  {
    index: '02',
    title: '개인·소그룹 수업',
    body: '아동의 특성과 목표에 맞춘 체육교육을 진행합니다.',
    href: SPOKEDU_PATHS.private,
  },
  {
    index: '03',
    title: 'SPOKEDU LAB',
    body: '수업자료와 운영을 연결하는 구독 시스템입니다.',
    href: SPOKEDU_PATHS.subscription,
  },
] as const;

/** Decision gateway — three options, one identical row rule, no thumbnails competing with the hero. */
export function ServiceGateway() {
  return (
    <section className={`${styles.section} ${styles.gateway}`} aria-labelledby="home-gateway-heading">
      <div className={styles.rail}>
        <div className={styles.gatewayGrid}>
          <h2 id="home-gateway-heading" className={`${styles.displaySection} ${styles.gatewayTitle}`}>
            무엇을
            <br />
            찾고 계신가요?
          </h2>
          <div className={styles.gatewayList}>
            {GATEWAY_ROWS.map((row) => (
              <Link key={row.index} href={row.href} className={styles.gatewayRow}>
                <span className={styles.meta}>{row.index}</span>
                <strong className={styles.heading}>{row.title}</strong>
                <p className={styles.body}>{row.body}</p>
                <i aria-hidden="true">→</i>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
