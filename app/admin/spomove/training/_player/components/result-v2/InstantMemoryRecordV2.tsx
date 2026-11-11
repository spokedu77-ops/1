import type { ResultFact } from '../../lib/trainingResultViewModel';
import { RecordV2Details } from './RecordV2Details';

export function InstantMemoryRecordV2({ settings }: { gridSize?: 3 | 4 | 5; settings: ResultFact[] }) {
  return settings.length ? <RecordV2Details title="사용한 격자 설정" items={settings} /> : null;
}
