import type { MasterSessionDto } from '../types/operational';
import { formatSeoulSessionDay, getSeoulSessionDay } from '../lib/sessionDateTime';

export function buildDefaultParentNotice(session: MasterSessionDto) {
  const present = session.attendance.filter((item) => item.status === 'present');
  const absent = session.attendance.filter((item) => item.status === 'absent');
  const completedPrograms = session.programs.filter((item) => item.isCompleted);
  return [
    `${formatSeoulSessionDay(getSeoulSessionDay(session.startAt), { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} ${session.className} 수업 안내`,
    completedPrograms.length ? `오늘은 ${completedPrograms.map((item) => item.programTitle ?? '이름 없는 활동').join(', ')} 활동을 진행했습니다.` : '오늘 수업은 활동 완료 기록 없이 진행되었습니다.',
    `출석 ${present.length}명, 결석 ${absent.length}명입니다.`,
    present.length ? `출석: ${present.map((item) => item.studentName).join(', ')}` : '',
    absent.length ? `결석: ${absent.map((item) => item.studentName).join(', ')}` : '',
    session.memo?.trim() ? `수업 메모: ${session.memo.trim()}` : '',
  ].filter(Boolean).join('\n');
}

export function resolveParentNotice(session: MasterSessionDto) {
  return session.parentNotice?.trim() || buildDefaultParentNotice(session);
}
