/* eslint-disable @next/next/no-img-element -- Real product UI shown in a wide frame; native image keeps the crop explicit. */
import Link from 'next/link';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import { HOME_MASTER_VISUAL } from './home-web-assets';
import styles from './home-web.module.css';

/** Product feature — LAB library UI + instructor-facing value (no unverified program count). */
export function MasterStage() {
  return (
    <section
      className={`${styles.section} ${styles.paper} ${styles.masterStage}`}
      aria-labelledby="home-master-heading"
    >
      <div className={styles.rail}>
        <div className={styles.masterHead}>
          <div className={styles.masterTitle}>
            <p className={styles.eyebrow}>SPOKEDU LAB</p>
            <h2 id="home-master-heading" className={styles.displaySection}>
              수업 콘텐츠를 찾고
              <br />
              수업을 운영합니다.
            </h2>
            <p className={styles.body}>
              놀이체육 프로그램과 수업 가이드를 살펴보고 수업반과 일정 등 운영 도구를 활용할 수 있습니다. 기능별
              이용 범위는 요금제에 따라 다릅니다.
            </p>
          </div>
          <p className={styles.labLibraryStat}>
            <span className={styles.statLabel}>놀이체육 프로그램 라이브러리</span>
          </p>
          <div className={`${styles.actions} ${styles.masterActions}`}>
            <Link href={SPOKEDU_PATHS.subscription} className={`${styles.btn} ${styles.btnSecondary}`}>
              SPOKEDU LAB 알아보기
            </Link>
          </div>
        </div>

        <div className={styles.productFrame}>
          <img src={HOME_MASTER_VISUAL.src} alt={HOME_MASTER_VISUAL.alt} loading="lazy" decoding="async" />
        </div>
      </div>
    </section>
  );
}
