import type { ResultFact } from '../../lib/trainingResultViewModel';
import { RecordV2Details } from './RecordV2Details';
import styles from './RecordV2Details.module.css';

export function TeacherInputRecordV2({ colorChoice, items, settings, available }: { colorChoice: boolean; items: ResultFact[]; settings: ResultFact[]; available: boolean }) {
  return <><div className={styles.visual}><h3>교사 입력 기반 기록</h3><p>{!available ? '검증 가능한 교사 입력 기록이 전달되지 않았습니다.' : colorChoice ? '입력한 색과 정답을 비교한 기록입니다.' : '교사가 직접 입력한 성공·실패 판정입니다.'}</p></div><RecordV2Details title="교사가 입력한 결과" items={items} />{settings.length ? <RecordV2Details title="사용한 제시 설정" items={settings} /> : null}</>;
}
