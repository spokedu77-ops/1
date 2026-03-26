export type AgeGroup = 'preschool' | 'elementary';

export interface QuestionOption {
  v: string;
  e: string;
  t: string;
  d: string;
}

export interface Question {
  id: number;
  axis: 'C/I' | 'R/E' | 'P/G' | 'D/S';
  label: string;
  q: string;
  opts: QuestionOption[];
}

export interface CompatEntry {
  n: string;
  d: string;
}

export interface WeakEntry {
  title: string;
  desc: string;
}

export interface Profile {
  title: string;
  char: string;
  em: string;
  col: string;
  colDim: string;
  grad: string;
  kw: string[];
  catchcopy: string;
  desc: string;
  env: string[];
  str: string[];
  tip: string[];
  shortTip: string;
  weak: WeakEntry;
  best: CompatEntry;
  care: CompatEntry;
}

export interface AxisBD {
  l: number;
  r: number;
  ll: string;
  rl: string;
  sel: string;
}

export interface BreakdownResult {
  social: AxisBD;
  structure: AxisBD;
  motivation: AxisBD;
  energy: AxisBD;
}

export interface ComputeResult {
  profile: Profile;
  key: string;
  bd: BreakdownResult;
  displayName: string;
}
