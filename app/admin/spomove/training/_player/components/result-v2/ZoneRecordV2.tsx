import styles from './ResultV2.module.css';
import zones from './ZoneResultV2.module.css';
import details from './RecordV2Details.module.css';

export function ZoneRecordV2({ items, horizontal }: { items: { id: string; label: string; count: number | null; position: number }[]; horizontal: boolean }) {
  return <ul className={`${styles.colorGrid} ${horizontal ? details.doors : ''}`} aria-label={horizontal ? '가로 네 문별 도착 기록' : '목표 구역별 실제 집계'}>{items.map(item => <li key={item.id} data-color={['red', 'yellow', 'green', 'blue'][item.position]}><div className={styles.colorHeading}><strong>{item.label}</strong><span>{item.count === null ? '기록 없음' : `${item.count}회`}</span></div>{horizontal ? <span className={details.number} aria-hidden="true">{item.position + 1}</span> : <span className={zones.positionIcon} aria-hidden="true">{[0, 1, 2, 3].map(position => <span key={position} data-selected={position === item.position} />)}</span>}</li>)}</ul>;
}
