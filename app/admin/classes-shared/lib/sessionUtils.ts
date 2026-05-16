import { MileageAction, TeacherInput } from '../types';

const safeJsonParse = <T>(text: string, fallback: T): T => {
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

/**
 * `EXTRA_TEACHERS:` 직후부터 첫 번째 JSON 배열 `[...]`만 잘라 파싱합니다.
 * 뒤에 줄바꿈·MILEAGE 등 다른 필드가 붙어 있어도 동작합니다.
 */
function extractExtraTeachersJsonArray(afterMarker: string): TeacherInput[] {
  const t = afterMarker.trim();
  const start = t.indexOf('[');
  if (start < 0) return [];
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i]!;
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (c === '[') depth++;
      else if (c === ']') {
        depth--;
        if (depth === 0) {
          return safeJsonParse<TeacherInput[]>(t.slice(start, i + 1), []);
        }
      }
    }
  }
  return safeJsonParse<TeacherInput[]>(t.slice(start), []);
}

export const parseExtraTeachers = (memo: string) => {
  if (!memo.includes('EXTRA_TEACHERS:')) {
    return { cleanMemo: memo, extraTeachers: [] as TeacherInput[] };
  }
  const parts = memo.split('EXTRA_TEACHERS:');
  const cleanMemo = parts[0].trim();
  const extraTeachers = extractExtraTeachersJsonArray(parts[1] || '');
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
