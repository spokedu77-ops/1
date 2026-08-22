import type { StudentProfile } from '../types';
import type {
  MasterStudentDto,
  MasterStudentMeta,
} from '../types/operational';

export function studentMetaToDisplay(meta: MasterStudentMeta): string {
  if (typeof meta === 'string') return meta;
  const values = Object.values(meta).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return values.join(' / ');
}

export function toStudentProfile(dto: MasterStudentDto): StudentProfile {
  return {
    id: dto.id,
    name: dto.name,
    group: dto.group ?? '',
    meta: studentMetaToDisplay(dto.meta),
    guidanceNote: dto.guidanceNote ?? '',
    level: '',
    attendance: 0,
    classes: 0,
    streak: 0,
    risk: null,
    skills: [],
    badges: [],
    history: [],
  };
}
