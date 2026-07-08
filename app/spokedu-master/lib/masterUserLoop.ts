import type { ClassRecord, UserProfile } from '../types';
import type { RecentProgramActivity } from './recentProgramActivity';
import { isPaidMasterPlan } from './subscription';

export type MasterLoopActionKey =
  | 'choose_lesson'
  | 'rerun_spomove'
  | 'start_record'
  | 'prepare_next'
  | 'review_pass'
  | 'operate';

export type MasterLoopAction = {
  key: MasterLoopActionKey;
  label: string;
  href: string;
  summary: string;
};

export type MasterLoopStateInput = {
  profile: UserProfile | null;
  recentLessonActivities: RecentProgramActivity[];
  recentSpomoveActivities: RecentProgramActivity[];
  classRecords: ClassRecord[];
  explanationCount: number;
};

export function isMasterFirstUser(input: {
  studentCount: number;
  classRecords: ClassRecord[];
  recentLessonActivities: RecentProgramActivity[];
  recentSpomoveActivities: RecentProgramActivity[];
}) {
  return (
    input.studentCount === 0 &&
    input.classRecords.length === 0 &&
    input.recentLessonActivities.length === 0 &&
    input.recentSpomoveActivities.length === 0
  );
}

export function selectMasterLoopAction(input: MasterLoopStateInput): MasterLoopAction {
  const hasLessonUseExperience = input.recentLessonActivities.length > 0;
  const hasSpomoveUseExperience = input.recentSpomoveActivities.length > 0;
  const hasUseExperience =
    hasLessonUseExperience || hasSpomoveUseExperience || input.classRecords.length > 0;
  const hasRecords = input.classRecords.length > 0;
  const isPaid = isPaidMasterPlan(input.profile);

  if (isPaid && hasRecords) {
    return {
      key: 'operate',
      label: '다음 수업 준비',
      href: '/spokedu-master/activity',
      summary: '저장한 수업 기록을 기준으로 다음 준비를 이어갑니다.',
    };
  }

  if (!hasUseExperience) {
    return {
      key: 'choose_lesson',
      label: '오늘 수업 고르기',
      href: '/spokedu-master/library',
      summary: '수업 하나를 고르고 미리보기에서 대상·시간·준비물을 확인합니다.',
    };
  }

  if (!hasRecords && hasLessonUseExperience) {
    return {
      key: 'start_record',
      label: '수업 기록 시작',
      href: '/spokedu-master/class-record',
      summary: '실행한 일반 수업을 기록하면 안내문과 다음 준비에 다시 쓸 수 있습니다.',
    };
  }

  if (!hasRecords && hasSpomoveUseExperience) {
    const latestSpomove = [...input.recentSpomoveActivities].sort((a, b) =>
      b.occurredAt.localeCompare(a.occurredAt),
    )[0];
    return {
      key: 'rerun_spomove',
      label: 'SPOMOVE 다시 실행',
      href: latestSpomove
        ? `/spokedu-master/spomove/session?preset=${latestSpomove.programId}`
        : '/spokedu-master/spomove',
      summary: '최근 실행한 공식 활동을 큰 화면으로 다시 시작합니다.',
    };
  }

  return {
    key: 'prepare_next',
    label: '다음 수업 준비',
    href: '/spokedu-master/activity',
    summary: '최근 기록의 학생·메모 맥락을 확인하고 다음 수업 자료로 돌아갑니다.',
  };
}
