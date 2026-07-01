export type PlanType = 'free' | 'lite' | 'premium' | 'pro' | 'team';
export type UserRole = 'teacher' | 'director';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  school: string;
  avatarColor: string;
  plan: PlanType;
  role: UserRole;
  centerId: string | null;
  centerName: string | null;
  ageGroups: string[];
  programTypes: string[];
  onboardingDone: boolean;
  trialEndsAt: string | null;
  createdAt: string;
  isAdmin?: boolean;
  subscriptionStatus?: 'none' | 'active' | 'expired' | 'cancelled';
  previousPaidPlan?: 'lite' | 'premium' | 'pro' | 'team' | null;
  periodEnd?: string | null;
}

/** Supabase에서 로드된 프로그램 커스터마이징 메타 */
export interface SmProgramMeta {
  curriculumId: number;
  tags: string[];
  theme: string | null;
  grade: string | null;
  space: string | null;
  duration: number | null;
  isPro: boolean;
  isNew: boolean;
  isHot: boolean;
  displayOrder: number;
  colors: [string, string, string, string] | null;
}

export interface SessionConfig {
  interval: number;
  count: number;
  random: boolean;
  showRT: boolean;
  autoAdvance: boolean;
}

export interface Session {
  id: string;
  drillId: string;
  drillName: string;
  times: number[];
  cueCount: number;
  date: string;
  config: SessionConfig;
  avg?: number;
  best?: number;
}

export interface Lesson {
  id: number;
  title: string;
  classId: string;
  date: string;
  period: number;
  duration: number;
  done: boolean;
  color: string;
  memo?: string;
}

export type AttendanceStatus = 'pending' | 'present' | 'absent';

export interface StudentSkill {
  label: string;
  value: number;
  delta: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  group: string;
  meta: string;
  level: string;
  attendance: number;
  classes: number;
  streak: number;
  risk: string | null;
  skills: StudentSkill[];
  badges: string[];
  history: string[];
}

export interface ClassStudentRecord {
  studentId: string;
  studentName: string;
  attendance: AttendanceStatus;
  focused: boolean;
  skills: string[];
  memo?: string;
}

export interface ClassRecord {
  id: string;
  ownerId?: string;
  lessonTitle: string;
  classId: string;
  programId: string;
  programTitle: string;
  date: string;
  present: number;
  absent: number;
  focusCount: number;
  skillCount: number;
  kakaoSent: boolean;
  students: ClassStudentRecord[];
  memo?: string;
  parentNoteSnapshot?: string;
  recordType?: 'quick' | 'detailed';
}

export interface Notification {
  id: string;
  type: 'program' | 'report' | 'achievement' | 'billing';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface Program {
  id: string;
  title: string;
  category: string;
  grade: string;
  duration: number;
  space: string;
  description: string;
  steps: string[];
  equipment: string[];
  tags: string[];
  colors: [string, string, string, string];
  isPro: boolean;
  isNew: boolean;
  isHot?: boolean;
  /** 홈·라이브러리 노출 우선순위 (낮을수록 앞). API: sm_display_order */
  homeSortOrder?: number;
  /** YouTube 썸네일 URL (hqdefault.jpg 기준) */
  thumbnailUrl?: string;
  /** curriculum_id: Supabase curriculum 테이블의 id (동적 로딩 시 추적용) */
  curriculumId?: number;
  lessonDetail?: {
    recommendedAge: string;
    recommendedPlayers: string;
    objective: string;
    developmentFocus: string;
    coachScript: string;
    parentNote: string;
    fieldTips: string[];
    variations: string[];
    safetyNotes: string[];
    relatedSpomoveIds: string[];
    videoUrl?: string;
    heroImageUrl?: string;
    setupImageUrl?: string;
    galleryImageUrls?: string[];
    briefingNotes?: string[];
    rules?: string[];
    setupNotes?: string[];
  };
}
