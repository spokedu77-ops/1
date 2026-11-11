import type { ResultFact } from '../../lib/trainingResultViewModel';
import { RecordV2Details } from './RecordV2Details';

export function SequenceMemoryRecordV2({ association, settings }: { association: boolean; settings: ResultFact[] }) {
  return <RecordV2Details title={association ? '사용한 연합 기억 설정' : '사용한 기억 설정'} items={settings} />;
}
