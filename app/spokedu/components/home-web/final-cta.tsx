import Link from 'next/link';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import { HOME_FINAL_VISUAL } from './home-web-assets';
import styles from './home-web.module.css';
const ROWS = [['기관·학교 체육수업','우리 기관에 맞는 수업을 찾습니다.',SPOKEDU_PATHS.education],['SPOKEDU MASTER','수업자료와 운영 시스템을 확인합니다.',SPOKEDU_PATHS.subscription],['협업·파트너십','교육기관·기업 협업을 문의합니다.',SPOKEDU_PATHS.contact]] as const;
export function FinalCTA() { return <section className={`${styles.section} ${styles.final}`} aria-labelledby="home-final-heading"><div className={styles.finalHeading}><p className={styles.kicker}>LET&apos;S WORK TOGETHER</p><h2 id="home-final-heading" className={styles.title}>어떤 방식으로<br />함께할까요?</h2></div><div className={styles.finalList}>{ROWS.map(([label,body,href])=><Link key={label} href={href}><span><strong>{label}</strong><small>{body}</small></span><b aria-hidden="true">›</b></Link>)}</div><div className={styles.finalVisual}><img src={HOME_FINAL_VISUAL.src} alt={HOME_FINAL_VISUAL.alt}/><div><p>좋은 움직임이<br />더 나은 내일을 만듭니다.</p><Link href={SPOKEDU_PATHS.contact}>문의하기 <span aria-hidden="true">→</span></Link></div></div></section>; }
