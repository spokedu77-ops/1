import styles from './ResultV2.module.css';
import details from './RecordV2Details.module.css';

export function NumberRecordV2({ items }: { items: { id: string; label: string; count: number | null }[] }) {
  return <ul className={styles.colorGrid} aria-label="숫자별 실제 제시 횟수">{items.map(item => <li key={item.id} data-color="blue"><div className={styles.colorHeading}><strong>{item.label}</strong><span>{item.count === null ? '기록 없음' : `${item.count}회`}</span></div><span className={details.number} aria-hidden="true">{item.id}</span></li>)}</ul>;
}
