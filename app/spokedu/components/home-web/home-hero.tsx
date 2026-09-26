import Link from 'next/link';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import { HOME_HERO_IMAGE } from './home-web-assets';
import styles from './home-web.module.css';
export function HomeHero() { return <section className={styles.hero} aria-labelledby="home-hero-heading"><div className={styles.heroInner}><div className={styles.heroCopy}><div className={styles.heroEyebrow}><strong>SPOKEDU</strong><span>아동 · 청소년 · 특수 체육교육</span></div><h1 id="home-hero-heading" className={styles.heroDisplay}>MOVEMENT<br />BECOMES<br />LEARNING.</h1><p className={styles.body}>학교와 기관에서 직접 수업하고<br />현장에서 필요한 프로그램과 시스템을 만듭니다.</p><div className={styles.heroActions}><Link href={SPOKEDU_PATHS.education} className={styles.button}>수업 알아보기</Link><Link href={SPOKEDU_PATHS.subscription} className={styles.buttonGhost}>수업자료 둘러보기</Link></div></div><div className={styles.heroVisual}><img src={HOME_HERO_IMAGE.src} alt={HOME_HERO_IMAGE.alt} /></div></div></section>; }
