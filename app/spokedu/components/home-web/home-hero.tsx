/* eslint-disable @next/next/no-img-element -- Hero crop is art-directed via object-position on a native image. */
import Link from 'next/link';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import { HOME_HERO_IMAGE } from './home-web-assets';
import styles from './home-web.module.css';

/** Composition A — Editorial Split. Copy on the left text axis, one image bleeding to the right edge. */
export function HomeHero() {
  return (
    <section className={styles.hero} aria-labelledby="home-hero-heading">
      <div className={`${styles.rail} ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <p className={styles.heroBrand}>
            <strong>SPOKEDU</strong>
            <span>아동 · 청소년 · 특수 체육교육</span>
          </p>
          <h1 id="home-hero-heading" className={styles.displayHero}>
            MOVEMENT
            <br />
            BECOMES
            <br />
            LEARNING.
          </h1>
          <p className={styles.lead}>
            학교와 기관에서 직접 수업하고{' '}
            <br />
            현장에서 필요한 프로그램과 시스템을 만듭니다.
          </p>
          <div className={styles.actions}>
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
