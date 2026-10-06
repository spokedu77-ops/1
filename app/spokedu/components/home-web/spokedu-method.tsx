/* eslint-disable @next/next/no-img-element -- Step visuals share one 4:3 frame with explicit object-position. */
import { HOME_METHOD_VISUALS } from './home-web-assets';
import styles from './home-web.module.css';

const STEPS = [
  { index: '01', label: 'Field', title: '현장', body: '직접 수업합니다.' },
  { index: '02', label: 'Content', title: '콘텐츠', body: '현장에서 필요한 프로그램을 만듭니다.' },
  { index: '03', label: 'System', title: '시스템', body: '수업을 운영하고 확장할 수 있도록 연결합니다.' },
] as const;

/** Composition B — one progression, one repeated step structure: rule → index → title → 4:3 visual → description. */
export function SpokeduMethod() {
  return (
    <section className={`${styles.section} ${styles.paper}`} aria-labelledby="home-method-heading">
      <div className={styles.rail}>
        <div className={styles.head}>
          <div className={styles.headTitle}>
            <p className={styles.eyebrow}>SPOKEDU</p>
            <h2 id="home-method-heading" className={styles.displaySection}>
              현장에서 시작해
              <br />
              콘텐츠와 시스템으로
              <br />
              확장합니다.
            </h2>
          </div>
          <p className={`${styles.lead} ${styles.headAside}`}>
            SPOKEDU는 현장의 수업 경험을 바탕으로 필요한 프로그램과 시스템을 직접 만들고, 더 많은 아이들에게 좋은
            체육교육이 닿을 수 있도록 확장합니다.
          </p>
        </div>

        <ol className={styles.steps}>
          {STEPS.map((step, i) => {
            const visual = HOME_METHOD_VISUALS[i];
            const isProductUi = i > 0;
            return (
              <li key={step.index} className={styles.step}>
                <p className={styles.stepMeta}>
                  <span className={styles.eyebrow}>{step.index}</span>
                  <span className={styles.eyebrow}>{step.label}</span>
                </p>
                <h3 className={styles.heading}>{step.title}</h3>
                <div className={`${styles.media} ${styles.r43} ${isProductUi ? styles.uiFrame : ''}`}>
                  <img
                    src={visual.src}
                    alt={visual.alt}
                    style={{ objectPosition: visual.objectPosition }}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <p className={styles.body}>{step.body}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
