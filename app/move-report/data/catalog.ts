import type { AgeGroup, Profile, Question } from '../types';
import type { MoveReportLocale } from '../lib/locale';
import { AGE_GROUPS } from './ageGroups';
import { AGE_GROUPS_EN } from './ageGroups.en';
import { ELEMENTARY_QUESTIONS_EN } from './elementaryQuestions.en';
import { P } from './profiles';
import { P_EN } from './profiles.en';
import { PRESCHOOL_QUESTIONS_EN } from './preschoolQuestions.en';
import { Qs } from './questions';

export function getProfiles(locale: MoveReportLocale): Record<string, Profile> {
  return locale === 'en' ? P_EN : P;
}

export function getQuestions(locale: MoveReportLocale): Record<AgeGroup, Question[]> {
  if (locale === 'en') {
    return {
      preschool: PRESCHOOL_QUESTIONS_EN,
      elementary: ELEMENTARY_QUESTIONS_EN,
    };
  }
  return Qs;
}

export function getAgeGroups(locale: MoveReportLocale): Record<string, { label: string; hint: string }> {
  return locale === 'en' ? AGE_GROUPS_EN : AGE_GROUPS;
}
