/* eslint-disable @next/next/no-img-element -- Real product UI shown in a wide frame; native image keeps the crop explicit. */
import Link from 'next/link';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import { HOME_MASTER_VISUAL } from './home-web-assets';
import styles from './home-web.module.css';

/** Composition C — Product Feature. Head (headline · description · 144+ · CTA) then the real product screen as the hero. */
export function MasterStage() {
  return (
    <section className={`${styles.section} ${styles.paper}`} aria-labelledby="home-master-heading">
      <div className={styles.rail}>
        <div className={styles.masterHead}>
          <div className={styles.masterTitle}>
            <p className={styles.eyebrow}>SPOKEDU MASTER</p>
            <h2 id="home-master-heading" className={styles.displaySection}>
              수업자료부터
              <br />
              운영과 기록까지.
            </h2>
            <p className={styles.body}>
              현장에서 바로 활용할 수 있는 놀이체육 프로그램과 수업 가이드부터 수업반, 학생, 일정, 출석과 기록까지
              SPOKEDU MASTER 하나에서 관리합니다.
            </p>
          </div>
          <p className={styles.stat}>
            <strong className={styles.statNum}>144+</strong>
            <span className={styles.statLabel}>놀이체육 프로그램</span>
          </p>
          <div className={`${styles.actions} ${styles.masterActions}`}>
            <Link href={SPOKEDU_PATHS.subscription} className={`${styles.btn} ${styles.btnSecondary}`}>
              SPOKEDU MASTER 알아보기
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
