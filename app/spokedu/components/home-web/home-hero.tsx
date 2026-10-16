/* eslint-disable @next/next/no-img-element -- Hero crop is art-directed via object-position on a native image. */
import Link from 'next/link';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import { HOME_HERO_IMAGE } from './home-web-assets';
import styles from './home-web.module.css';

/** Phase 1-B1 — Desktop B / Mobile A in one component (responsive order & hierarchy). */
export function HomeHero() {
  return (
    <section className={styles.hero} aria-labelledby="home-hero-heading">
      <div className={`${styles.rail} ${styles.heroGrid}`}>
        <div className={styles.heroText}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>아동 · 청소년 · 특수 체육교육</p>
            <h1 id="home-hero-heading" className={styles.heroH1}>
              움직임으로
              <br />
              아이의 성장을
              <br />
              설계합니다.
            </h1>
            <p className={styles.heroEnglish}>
              MOVEMENT
              <br />
              BECOMES
              <br />
              LEARNING.
            </p>
            <p className={styles.heroLead}>
              학교와 기관에서 직접 수업하고 아이의 움직임과 참여 수준에 맞는 프로그램과 지도자용 수업
              시스템을 만듭니다.
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link href={SPOKEDU_PATHS.education} className={`${styles.btn} ${styles.btnPrimary}`}>
              수업 알아보기
            </Link>
            <Link href={SPOKEDU_PATHS.subscription} className={`${styles.btn} ${styles.btnSecondary}`}>
              수업자료 둘러보기
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={`${styles.media} ${styles.r43}`}>
            <img
              src={HOME_HERO_IMAGE.src}
              alt={HOME_HERO_IMAGE.alt}
              style={{ objectPosition: HOME_HERO_IMAGE.objectPosition }}
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
