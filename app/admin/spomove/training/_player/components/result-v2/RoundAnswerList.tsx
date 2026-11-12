import type { RoundAnswerRecord } from '../../lib/roundAnswerRecord';
import styles from './RoundAnswerList.module.css';
import { AnswerText } from './AnswerText';

export function RoundAnswerList({ record }: { record: RoundAnswerRecord }) {
  return <div className={styles.list}>{record.map(answer => !answer.steps?.length ? <div key={answer.round} className={`${styles.round} ${styles.answer}`}>
    <span>{answer.round}라운드</span>
    <strong><AnswerText text={answer.summary} /></strong>
  </div> : <details key={answer.round} className={styles.round}>
    <summary><span>{answer.round}라운드</span><strong><AnswerText text={answer.summary} /></strong></summary>
    <div className={styles.body}>{answer.steps?.length ? <ol>{answer.steps.map((step, index) => <li key={index}><AnswerText text={step} /></li>)}</ol> : <p><AnswerText text={answer.summary} /></p>}</div>
  </details>)}</div>;
}
