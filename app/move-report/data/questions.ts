import type { AgeGroup } from '../types';
import type { Question } from '../types';
import { ELEMENTARY_QUESTIONS } from './elementaryQuestions';
import { PRESCHOOL_QUESTIONS } from './preschoolQuestions';

export const Qs: Record<AgeGroup, Question[]> = {
  preschool: PRESCHOOL_QUESTIONS,
  elementary: ELEMENTARY_QUESTIONS,
};
