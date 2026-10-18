/* eslint-disable @next/next/no-img-element -- Hero uses native img with cover in a fixed aspect frame. */
import Link from 'next/link';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import { HOME_HERO_IMAGE } from './home-web-assets';
import styles from './home-web.module.css';

<<<<<<< HEAD
/** Desktop uses the approved editorial hierarchy; mobile promotes the Korean message and field image. */
=======
/** Phase 1-B5 — Minimal hero: KO H1, one line of proof, single 16:9 photo, two CTAs. */
>>>>>>> 5e263593f482ea85aa2c6b7bbd8e50e2df05e2cc
export function HomeHero() {
  return (
    <section className={styles.hero} aria-labelledby="home-hero-heading">
      <div className={`${styles.rail} ${styles.heroGrid}`}>
<<<<<<< HEAD
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>아동 · 청소년 · 특수 체육교육</p>
          <p className={styles.heroEnglish} aria-label="Movement becomes learning">
            MOVEMENT
            <br />
            {' '}
            BECOMES
            <br />
            {' '}
            LEARNING.
          </p>
          <h1 id="home-hero-heading" className={styles.heroKorean}>
            움직임으로 아이의 성장을 설계합니다.
          </h1>
          <p className={styles.heroLead}>
            학교와 기관에서 직접 수업하고 아이의 움직임과 참여 수준에 맞는 프로그램과 지도자용 수업 시스템을 만듭니다.
          </p>
=======
        <div className={styles.heroText}>
          <div className={styles.heroCopy}>
            <h1 id="home-hero-heading" className={styles.heroH1}>
              움직임으로 아이의 성장을 설계합니다.
            </h1>
            <p className={styles.heroLead}>
              아이들을 직접 가르치고 체육수업에 필요한 프로그램과 도구를 만듭니다.
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link href={SPOKEDU_PATHS.education} className={`${styles.btn} ${styles.btnPrimary}`}>
              수업 알아보기
            </Link>
            <Link href={SPOKEDU_PATHS.subscription} className={styles.heroLinkSecondary}>
              수업자료 둘러보기 →
            </Link>
          </div>
>>>>>>> 5e263593f482ea85aa2c6b7bbd8e50e2df05e2cc
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
            수업 알아보기
          </Link>
          <Link href={SPOKEDU_PATHS.subscription} className={`${styles.btn} ${styles.btnSecondary}`}>
            수업자료 둘러보기
          </Link>
        </div>
      </div>
    </section>
  );
}
