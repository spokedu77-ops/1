/* eslint-disable @next/next/no-img-element -- Method visuals share one 4:3 frame with explicit object-position. */
import { HOME_METHOD_VISUALS } from './home-web-assets';
import styles from './home-web.module.css';

const METHOD_PILLARS = [
  {
    label: 'FIELD',
    title: '현장 수업',
    body: '학교와 기관에서 대상과 공간에 맞춰 체육수업을 설계하고 운영합니다.',
    uiFrame: null,
  },
  {
    label: 'CONTENT',
    title: '수업 콘텐츠',
    body: '현장에서 활용할 수 있는 놀이체육 프로그램과 수업 가이드를 제공합니다.',
    uiFrame: styles.methodUiContent,
  },
  {
    label: 'SYSTEM',
    title: '운영 시스템',
    body: 'SPOKEDU LAB에서 수업 준비부터 수업반·학생·일정·출석·기록까지 관리할 수 있습니다.',
    uiFrame: styles.methodUiSystem,
  },
] as const;

/** Three linked operating areas — field instruction, content, and LAB tooling (not a fixed step sequence). */
export function SpokeduMethod() {
  return (
    <section className={`${styles.section} ${styles.paper}`} aria-labelledby="home-method-heading">
      <div className={styles.rail}>
        <div className={styles.head}>
          <div className={styles.headTitle}>
            <p className={styles.eyebrow}>SPOKEDU METHOD</p>
            <h2 id="home-method-heading" className={styles.displaySection}>
              현장의 경험을 수업 콘텐츠와 운영 도구로 연결합니다.
            </h2>
          </div>
          <p className={`${styles.lead} ${styles.headAside}`}>
            SPOKEDU는 학교와 기관에서 직접 체육수업을 운영합니다. 또한 현장에서 활용할 수 있는 프로그램과 지도자용
            운영 시스템을 개발합니다.
          </p>
        </div>

        <div className={styles.steps} role="group" aria-label="SPOKEDU 운영 영역">
          {METHOD_PILLARS.map((pillar, i) => {
            const visual = HOME_METHOD_VISUALS[i];
            const isProductUi = pillar.uiFrame != null;
            return (
              <article key={pillar.label} className={styles.step}>
                <p className={styles.stepMeta}>
                  <span className={styles.eyebrow}>{pillar.label}</span>
                </p>
                <h3 className={styles.heading}>{pillar.title}</h3>
                <div
                  className={`${styles.media} ${styles.r43} ${isProductUi ? styles.uiFrame : ''} ${pillar.uiFrame ?? ''}`}
                >
                  <img
                    src={visual.src}
                    alt={visual.alt}
                    style={{ objectPosition: visual.objectPosition }}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <p className={styles.body}>{pillar.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
