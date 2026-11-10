import type { ResultFact } from '../../lib/trainingResultViewModel';
import { RecordV2Details } from './RecordV2Details';

export function TimeConfigurationRecordV2({ facts, settings }: { facts: ResultFact[]; settings: ResultFact[] }) {
  return <><RecordV2Details title="실제 진행 기록" items={facts} /><RecordV2Details title="설정된 단계·움직임 구성" items={settings} /></>;
}
