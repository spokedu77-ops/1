/* eslint-disable @next/next/no-img-element -- Hero uses native img with cover in a fixed aspect frame. */
import Link from 'next/link';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import { HOME_HERO_IMAGE } from './home-web-assets';
import styles from './home-web.module.css';

/** Phase 1-B5 — Minimal hero: KO H1, one line of proof, single photo, two CTAs. */
export function HomeHero() {
  return (
    <section className={`${styles.hero} ${styles.heroIntegrated}`} aria-labelledby="home-hero-heading">
      <div className={`${styles.rail} ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <h1 id="home-hero-heading" className={styles.heroH1}>
            움직임으로 아이의 성장을 설계합니다.
          </h1>
          <p className={styles.heroLead}>
            학교·기관에서 직접 체육수업을 운영하고, 그 경험으로 SPOMOVE 프로그램과 SPOKEDU LAB 수업
            도구를 만듭니다.
          </p>
        </div>

        <div className={styles.heroVisual}>
          <div className={`${styles.media} ${styles.r169}`}>
            <img
              src={HOME_HERO_IMAGE.src}
              alt={HOME_HERO_IMAGE.alt}
              style={{ objectPosition: HOME_HERO_IMAGE.objectPosition }}
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </div>

        <div className={styles.heroActions}>
          <Link href={SPOKEDU_PATHS.education} className={`${styles.btn} ${styles.btnPrimary}`}>
            기관·학교 체육수업
          </Link>
          <Link href={SPOKEDU_PATHS.subscription} className={`${styles.btn} ${styles.btnSecondary}`}>
            SPOKEDU LAB
          </Link>
        </div>
      </div>
    </section>
  );
}
