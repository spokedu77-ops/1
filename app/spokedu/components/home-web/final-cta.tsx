import Link from 'next/link';
import { SPOKEDU_PATHS } from '../../data/public-routes';
import styles from './home-web.module.css';

const FINAL_LINKS = [
  { label: '기관·학교 체육수업', href: SPOKEDU_PATHS.education },
  { label: 'SPOKEDU MASTER', href: SPOKEDU_PATHS.subscription },
  { label: '협업·파트너십', href: SPOKEDU_PATHS.contact },
] as const;

/** Conclusion of the homepage — typography, one primary action, compact secondary paths. No image. */
export function FinalCTA() {
  return (
    <section className={`${styles.section} ${styles.dark}`} aria-labelledby="home-final-heading">
      <div className={styles.rail}>
        <div className={styles.finalGrid}>
          <div className={styles.finalCopy}>
            <p className={styles.eyebrow}>Let&apos;s work together</p>
            <h2 id="home-final-heading" className={styles.displaySection}>
              어떤 방식으로
              <br />
              함께할까요?
            </h2>
            <p className={styles.lead}>좋은 움직임이 더 나은 내일을 만듭니다.</p>
            <div className={styles.actions}>
              <Link href={SPOKEDU_PATHS.contact} className={`${styles.btn} ${styles.btnPrimary}`}>
                문의하기
              </Link>
            </div>
          </div>

          <nav className={styles.finalLinks} aria-label="함께하는 방식">
            {FINAL_LINKS.map((link) => (
              <Link key={link.label} href={link.href}>
                <span>{link.label}</span>
                <i aria-hidden="true">→</i>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
