import type { ResultFact } from '../../lib/trainingResultViewModel';
import { RecordV2Details } from './RecordV2Details';
import styles from './RecordV2Details.module.css';

export function SequenceMemoryRecordV2({ association, settings }: { association: boolean; settings: ResultFact[] }) {
  return <><div className={styles.visual}><h3>{association ? '색과 번호의 연결' : '색의 순서와 기억 길이'}</h3><ol className={styles.phases} aria-label="활동의 구성 단계"><li>정보 제시</li><li>{association ? '연결 기억' : '순서 기억'}</li><li>{association ? '질문 확인' : '순차 표현'}</li></ol><p>설정된 제시 구성을 살펴보세요.</p></div><RecordV2Details title="사용한 기억 설정" items={settings} /></>;
}
