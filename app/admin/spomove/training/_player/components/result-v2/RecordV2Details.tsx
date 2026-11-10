import type { ResultFact } from '../../lib/trainingResultViewModel';
import styles from './RecordV2Details.module.css';

export function RecordV2Details({ title, items }: { title: string; items: ResultFact[] }) {
  return <section className={styles.details}><h3>{title}</h3>{items.length ? <dl>{items.map(item => <div key={item.id}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : <p>기록 없음</p>}</section>;
}
