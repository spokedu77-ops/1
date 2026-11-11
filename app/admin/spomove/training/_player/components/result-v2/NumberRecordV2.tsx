import styles from './ResultV2.module.css';

export function NumberRecordV2({ items }: { items: { id: string; label: string; count: number | null }[] }) {
  return <ul className={styles.colorGrid} aria-label="숫자별 실제 제시 횟수">{items.map(item => <li key={item.id} data-color="blue"><div className={styles.colorHeading}><strong>{item.label}</strong></div><div className={styles.recordCount}>{item.count === null ? <small>기록 없음</small> : <><span>{item.count}</span><small>회</small></>}</div></li>)}</ul>;
}
