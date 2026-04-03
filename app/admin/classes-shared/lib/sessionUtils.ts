import { MileageAction, TeacherInput } from '../types';

export const safeJsonParse = <T>(text: string, fallback: T): T => {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};

export const extractMileageAction = (memo: string, mileageOption?: string) => {
  if (mileageOption) return { cleanMemo: memo, mileageAction: mileageOption };
  if (!memo.includes('MILEAGE_ACTIONS:')) return { cleanMemo: memo, mileageAction: '' };

  const parts = memo.split('MILEAGE_ACTIONS:');
  return {
    cleanMemo: parts[0].trim(),
    mileageAction: parts[1]?.trim() || ''
  };
};

export const parseExtraTeachers = (memo: string) => {
  if (!memo.includes('EXTRA_TEACHERS:')) {
    return { cleanMemo: memo, extraTeachers: [] as TeacherInput[] };
  }
  const parts = memo.split('EXTRA_TEACHERS:');
  const cleanMemo = parts[0].trim();
  const extraTeachers = safeJsonParse<TeacherInput[]>(parts[1] || '[]', []);
  return { cleanMemo, extraTeachers };
};

export const buildMemoWithExtras = (memo: string, extras: TeacherInput[]) => {
  if (extras.length === 0) return memo;
  return `${memo}\nEXTRA_TEACHERS:${JSON.stringify(extras)}`;
};

export const getMileageTotal = (actionStr: string, actions: MileageAction[]) => {
  const list = actionStr ? actionStr.split(',').map(s => s.trim()).filter(Boolean) : [];
  return list.reduce((sum, label) => sum + (actions.find(d => d.label === label)?.val || 0), 0);
};
