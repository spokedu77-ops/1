/* eslint-disable @next/next/no-img-element -- One dominant field photo with an explicit focal point. */
import Link from 'next/link';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import { HOME_SPOMOVE_VISUAL } from './home-web-assets';
import styles from './home-web.module.css';

/** Editorial split — SPOMOVE signal-to-movement program (single field proof image). */
export function SpomoveStage() {
  return (
    <section
      className={`${styles.section} ${styles.spomoveStage}`}
      aria-labelledby="home-spomove-heading"
    >
      <div className={styles.rail}>
        <div className={styles.split}>
          <div className={styles.splitCopy}>
            <p className={styles.eyebrow}>SPOMOVE</p>
            <p className={styles.spomoveLine}>SEE · DECIDE · MOVE</p>
            <h2 id="home-spomove-heading" className={styles.displaySection}>
              화면 신호를 보고
              <br />
              몸으로 반응합니다.
            </h2>
            <p className={styles.body}>
              화면에 나타나는 색·위치·방향 신호를 확인하고 선택한 뒤 스포매트 또는 수업 공간에서 움직임으로 반응하는
              체육 프로그램입니다.
            </p>
            <p className={styles.meta}>단순 반응 · 선택 반응 · 복합 반응</p>
            <div className={styles.actions}>
              <Link href={SPOKEDU_PATHS.spomove} className={`${styles.btn} ${styles.btnSecondary}`}>
                SPOMOVE 자세히 보기
              </Link>
            </div>
          </div>

          <div className={styles.splitVisual}>
            <div className={`${styles.media} ${styles.r43}`}>
              <img
                src={HOME_SPOMOVE_VISUAL.src}
                alt={HOME_SPOMOVE_VISUAL.alt}
                style={{ objectPosition: HOME_SPOMOVE_VISUAL.objectPosition }}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
