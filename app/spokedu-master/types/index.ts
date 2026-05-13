export type PlanType = 'free' | 'pro' | 'team';
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
}

export interface Cue {
  symbol: string;
  label: string;
  bgColor: string;
}

export interface Drill {
  id: string;
  name: string;
  category: string;
  cues: Cue[];
  isPro: boolean;
  bgColor: string;
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
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface Notification {
  id: string;
  type: 'program' | 'report' | 'achievement' | 'billing';
  title: string;
  body: string;
  href?: string;
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
  };
}
