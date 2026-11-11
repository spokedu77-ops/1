import type { ColorStimulusCounts } from '../../lib/trainingResultSummary';
import { validResultCount } from '../../lib/trainingResultV2Shared';
import styles from './ResultV2.module.css';

const COLORS = [{ id: 'red', name: '빨강' }, { id: 'yellow', name: '노랑' }, { id: 'green', name: '초록' }, { id: 'blue', name: '파랑' }] as const;

/** Priority: all equal > tied leaders > unique leader. Zero/missing records have no highlight. */
export function colorRecordFeature(counts: ColorStimulusCounts | null) {
  if (!counts || !COLORS.every(color => validResultCount(counts[color.id]))) return null;
  const peak = Math.max(...COLORS.map(color => counts[color.id]));
  if (peak === 0) return null;
  const leaders = COLORS.filter(color => counts[color.id] === peak).map(color => color.name);
  if (leaders.length === 4) return '네 가지 색상 신호가 같은 횟수로 제시되었어요.';
  if (leaders.length > 1) return `${leaders.join('·')} 신호가 같은 횟수로 가장 많이 제시되었어요.`;
  return `${leaders[0]} 신호가 가장 많이 제시되었어요.`;
}

export function ColorRecordPanel({ counts }: { counts: ColorStimulusCounts | null }) {
  const peak = counts && COLORS.every(color => validResultCount(counts[color.id])) ? Math.max(...COLORS.map(color => counts[color.id])) : 0;
  return <ul className={`${styles.colorGrid} ${styles.matGrid}`} aria-label="색상별 실제 제시 횟수">{COLORS.map(color => {
    const value = counts?.[color.id];
    return <li key={color.id} data-color={color.id} data-most={peak > 0 && value === peak}><div className={styles.colorHeading}><strong><span aria-hidden="true" />{color.name}</strong></div><div className={styles.recordCount}>{validResultCount(value) ? <><span>{value}</span><small>회</small></> : <small>기록 없음</small>}</div></li>;
  })}</ul>;
}
