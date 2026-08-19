import { homePage } from '../../data/home-page';
import { homeSectionScrollMt, marketingSectionInner } from '../../lib/ui-classes';
import styles from './home-canonical.module.css';

export function HomeFieldBridge() {
  const section = homePage.bridge;
  return (
    <section id={section.id} className={`${homeSectionScrollMt} bg-[#EAF1FF] py-10 sm:py-12 lg:py-14`} aria-labelledby="home-bridge-heading">
      <div className={`${marketingSectionInner} ${styles.bridgeLayout}`}>
        <h2 id="home-bridge-heading" className={styles.bridgeTitle}>{section.title}</h2>
        <ol className={styles.bridgeFlow} aria-label="현장에서 시스템으로 이어지는 과정">
          {section.steps.map((step) => (
            <li key={step.label}>
              <strong>{step.label}</strong>
              <span>{step.body}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

