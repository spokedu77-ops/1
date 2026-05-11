export type PlanType = 'free' | 'pro' | 'team';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  school: string;
  avatarColor: string;
  plan: PlanType;
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
}
