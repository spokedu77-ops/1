import { HOME_METHOD_VISUALS } from './home-web-assets';
import styles from './home-web.module.css';
const COLUMNS = [
  ['01', '현장', '직접 수업합니다.'],
  ['02', '콘텐츠', '현장에서 필요한 프로그램을 만듭니다.'],
  ['03', '시스템', '수업을 운영하고 확장할 수 있도록 연결합니다.'],
] as const;
export function SpokeduMethod() { return <section className={`${styles.section} ${styles.method}`} aria-labelledby="home-method-heading"><div className={styles.methodInner}><div className={styles.methodIntro}><div><p className={styles.methodLabel}>SPOKEDU</p><h2 id="home-method-heading" className={styles.title}>현장에서 시작해<br />콘텐츠와 시스템으로<br />확장합니다.</h2></div><p className={styles.body}>SPOKEDU는 현장의 수업 경험을 바탕으로<br />필요한 프로그램과 시스템을 직접 만들고,<br />더 많은 아이들에게 좋은 체육교육이<br />닿을 수 있도록 확장합니다.</p></div><div className={styles.methodColumns}>{COLUMNS.map(([index,label,title],i)=><article key={index} className={styles.methodColumn}><p><b>{index}</b><strong>{label}</strong></p><h3>{title}</h3><img src={HOME_METHOD_VISUALS[i].src} alt={HOME_METHOD_VISUALS[i].alt} />{i<2?<span aria-hidden="true">→</span>:null}</article>)}</div></div></section>; }
