import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readSessionDetailSource } from '../manage/session-detailTestSource';

const read = (path: string) => readFileSync(path, 'utf8');
const route = read('app/api/spokedu-master/sessions/[sessionId]/next/route.ts');
const manage = read('app/spokedu-master/manage/ManageView.tsx');
const detail = readSessionDetailSource();
const carryover = read('app/spokedu-master/activity/sessionCarryover.ts');

describe('previous Session reuse contract', () => {
  it('requires explicit carryover intent and keeps only canonical runtime paths', () => {
    expect(route).not.toContain('spokedu_master_create_next_session_fresh');
    expect(route).toContain("rpc('spokedu_master_create_next_session_v2'");
    expect(route).toContain("rpc('spokedu_master_create_next_session'");
    expect(route).toContain('활동 가져오기 방식을 확인해 주세요.');
    expect(carryover).toContain('sourceSessionProgramIds');
    expect(carryover).toContain('copyPrograms: false');
    expect(detail).toContain("const [copyMode, setCopyMode] = useState<SessionCarryoverMode>('all')");
  });

  it('does not present previous attendance or memo as copied data', () => {
    expect(detail).toContain('현재 수업반 명단을 사용합니다. 출석 결과와 메모, 기록은 가져오지 않습니다.');
    expect(detail).not.toContain('출석부를 이어받습니다');
    expect(detail).not.toContain('활동과 메모는 새로 시작합니다.');
  });

  it('opens the created Session and defaults to source time on the selected day', () => {
    expect(detail).toContain('initialTargetDay ?? addSeoulSessionDays');
    expect(detail).toContain('onSessionCreated(created)');
    expect(manage).toContain('setEditing(created)');
    expect(manage).toContain('setSelectedDay(day)');
  });
});
