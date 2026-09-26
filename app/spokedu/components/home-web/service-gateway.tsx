import Link from 'next/link';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import { HOME_SERVICE_VISUALS } from './home-web-assets';
import styles from './home-web.module.css';
const ROWS = [['01', '기관·학교 체육수업', '학교와 기관의 환경과 대상에 맞춰 수업을 설계하고 운영합니다.', SPOKEDU_PATHS.education], ['02', '개인·소그룹 수업', '아동의 특성과 목표에 맞춘 체육교육을 진행합니다.', SPOKEDU_PATHS.private], ['03', 'SPOKEDU MASTER', '수업자료와 운영을 연결하는 구독 시스템입니다.', SPOKEDU_PATHS.subscription]] as const;
export function ServiceGateway() { return <section className={`${styles.section} ${styles.gateway}`} aria-labelledby="home-gateway-heading"><div className={styles.sectionGrid}><h2 id="home-gateway-heading" className={styles.title}>무엇을<br />찾고 계신가요?</h2><div className={styles.gatewayIndex}>{ROWS.map(([index, title, body, href], row) => <Link key={index} href={href} className={styles.indexRow}><span className={styles.kicker}>{index}</span><strong>{title}</strong><span>{body}</span><b aria-hidden="true">↗</b><img src={HOME_SERVICE_VISUALS[row].src} alt={HOME_SERVICE_VISUALS[row].alt} /></Link>)}</div></div></section>; }
