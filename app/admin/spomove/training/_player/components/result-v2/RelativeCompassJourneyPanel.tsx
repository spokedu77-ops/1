import { padAt, type RelativeCompassJourney } from '../../lib/relativeCompass';
import styles from './RelativeCompassJourneyPanel.module.css';

const ARROWS = { up: '↑', down: '↓', left: '←', right: '→', 'up-left': '↖', 'up-right': '↗', 'down-left': '↙', 'down-right': '↘' };

export function RelativeCompassJourneyPanel({ journey }: { journey?: RelativeCompassJourney }) {
  if (!journey) return <p className={styles.note}>이 활동의 이동 순서가 기록되지 않았습니다.</p>;
  const start = padAt(journey.start);
  const completed = journey.steps.filter(step => step.completed);
  const final = completed.length ? padAt(completed[completed.length - 1]!.destination) : start;
  return <div className={styles.journey}>
    <p className={styles.note}>실제 제시된 신호에 따른 정답 경로입니다. 학생의 실제 이동을 측정한 기록은 아닙니다.</p>
    <ol className={styles.steps} aria-label="출발부터 순서대로 보는 정답 여정">
      <li><span className={styles.order}>출발</span><strong><i style={{ background: start.bg }} />{start.name}</strong></li>
      {journey.steps.map((step, index) => {
        const destination = padAt(step.destination);
        return <li key={index}>
          <span className={styles.order}>{index + 1}번째{step.completed ? '' : ' · 진행 중 종료'}</span>
          <span className={styles.arrow} aria-label={step.direction}>{ARROWS[step.direction]}</span>
          <strong><i style={{ background: destination.bg }} />{destination.name}</strong>
        </li>;
      })}
    </ol>
    <p className={styles.final}>{journey.steps.length > 0 && journey.steps.every(step => step.completed) ? '최종 정답' : '완료한 신호까지의 도착 색'}<strong><i style={{ background: final.bg }} />{final.name}</strong></p>
  </div>;
}
