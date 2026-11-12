import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight } from 'lucide-react';
import { CARDINAL_DIRECTIONS, validDirectionRecord, type DirectionPresentationRecord, type DirectionId } from '../../lib/directionPresentation';
import styles from './ResultV2.module.css';
import directionStyles from './DirectionResultV2.module.css';

const DIRECTIONS: Record<DirectionId, { icon: string; name: string; row: number; column: number }> = {
  up: { icon: '↑', name: '상단', row: 1, column: 2 }, down: { icon: '↓', name: '하단', row: 3, column: 2 },
  left: { icon: '←', name: '좌측', row: 2, column: 1 }, right: { icon: '→', name: '우측', row: 2, column: 3 },
  'up-left': { icon: '↖', name: '좌상단', row: 1, column: 1 }, 'up-right': { icon: '↗', name: '우상단', row: 1, column: 3 },
  'down-left': { icon: '↙', name: '좌하단', row: 3, column: 1 }, 'down-right': { icon: '↘', name: '우하단', row: 3, column: 3 },
};
const DIRECTION_ICONS = { up: ArrowUp, down: ArrowDown, left: ArrowLeft, right: ArrowRight, 'up-left': ArrowUpLeft, 'up-right': ArrowUpRight, 'down-left': ArrowDownLeft, 'down-right': ArrowDownRight };

export function directionRecordFeature(record?: DirectionPresentationRecord) {
  if (!validDirectionRecord(record)) return null;
  const peak = Math.max(...record.directions.map(id => record.counts[id]!));
  if (!peak) return null;
  const leaders = record.directions.filter(id => record.counts[id] === peak).map(id => DIRECTIONS[id].name);
  return leaders.length === record.directions.length
    ? `${record.directions.length === 4 ? '네' : record.directions.length} 방향의 신호가 같은 횟수로 제시되었어요.`
    : `${leaders.join('·')} 방향 신호가 ${leaders.length > 1 ? '같은 횟수로 ' : ''}가장 많이 제시되었어요.`;
}

/** Match the mat's cardinal diamond; diagonal records retain the full compass. */
export function DirectionRecordPanel({ record, supportedDirections = CARDINAL_DIRECTIONS }: { record?: DirectionPresentationRecord; supportedDirections?: readonly DirectionId[] }) {
  const valid = validDirectionRecord(record);
  const recordedDirections = record?.directions.filter(id => Object.hasOwn(DIRECTIONS, id));
  const directions = recordedDirections?.length ? [...new Set(recordedDirections)] : supportedDirections;
  const spatial = directions.some(id => id.includes('-'));
  return <div className={`${styles.colorGrid} ${directionStyles.compass}`} data-direction-layout={spatial ? 'compass' : 'diamond'} aria-label="방향별 실제 제시 횟수">
    {directions.map(id => { const item = DIRECTIONS[id]; const Icon = DIRECTION_ICONS[id]; return <div key={id} className={directionStyles.card} data-direction={id} style={spatial ? { gridRow: item.row, gridColumn: item.column } : undefined}>
      <div className={styles.colorHeading}><strong><Icon className={directionStyles.arrow} aria-hidden="true" />{item.name}</strong></div><div className={styles.recordCount}>{valid ? <><span>{record.counts[id]}</span><small>회</small></> : <small>기록 없음</small>}</div>
    </div>; })}
  </div>;
}
