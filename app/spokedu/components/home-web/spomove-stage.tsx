/* eslint-disable @next/next/no-img-element -- One dominant field photo with an explicit focal point. */
import Link from 'next/link';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import { HOME_SPOMOVE_VISUAL } from './home-web-assets';
import styles from './home-web.module.css';

/** Composition A — Editorial Split. SPOMOVE → SEE · DECIDE · MOVE → headline → explanation → CTA → one visual. */
export function SpomoveStage() {
  return (
    <section className={styles.section} aria-labelledby="home-spomove-heading">
      <div className={styles.rail}>
        <div className={styles.split}>
          <div className={styles.splitCopy}>
            <p className={styles.eyebrow}>SPOMOVE</p>
            <p className={styles.spomoveLine}>SEE · DECIDE · MOVE</p>
            <h2 id="home-spomove-heading" className={styles.displaySection}>
              보고 판단하고
              <br />
              움직입니다.
            </h2>
            <p className={styles.body}>
              SPOMOVE는 시각적 자극에 대한 인지, 판단, 움직임을 통합적으로 경험하는 SPOKEDU의 대표적인 체육
              콘텐츠입니다.
            </p>
            <p className={styles.meta}>색상 인지 · 선택 반응 · 복합 인지</p>
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
