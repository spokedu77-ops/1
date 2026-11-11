import styles from './ResultV2.module.css';
import details from './RecordV2Details.module.css';

export function ZoneRecordV2({ items, horizontal }: { items: { id: string; label: string; count: number | null; position: number }[]; horizontal: boolean }) {
  return <ul className={`${styles.colorGrid} ${horizontal ? details.doors : ''}`} aria-label={horizontal ? '가로 네 문별 도착 기록' : '목표 구역별 실제 집계'}>{items.map(item => <li key={item.id} data-color={['red', 'yellow', 'green', 'blue'][item.position]}><div className={styles.colorHeading}><strong>{item.label}</strong></div><div className={styles.recordCount}>{item.count === null ? <small>기록 없음</small> : <><span>{item.count}</span><small>회</small></>}</div></li>)}</ul>;
}
