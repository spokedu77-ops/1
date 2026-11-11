import type { ResultFact } from '../../lib/trainingResultViewModel';
import styles from './RecordV2Details.module.css';

export function RecordV2Details({ title, items }: { title: string; items: ResultFact[] }) {
  const compact = items.length > 0 && items.length <= 2;
  return <section className={`${styles.details} ${compact ? styles.compact : ''}`} aria-label={compact ? title : undefined}>{!compact ? <h3>{title}</h3> : null}{items.length ? <dl>{items.map(item => <div key={item.id}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : <p>기록 없음</p>}</section>;
}
