// ===================================================================
// 피드백 검증 로직 - 간소화 버전
// ===================================================================
// 필수: 5개 전항목, 사진은 선택사항
// ===================================================================

/** 텍스트 피드백 항목 (`center_document_names` 등과 구분) */
export type FeedbackTextFieldKey =
  | 'main_activity'
  | 'strengths'
  | 'improvements'
  | 'next_goals'
  | 'condition_notes';

export const FEEDBACK_TEXT_FIELD_KEYS: readonly FeedbackTextFieldKey[] = [
  'main_activity',
  'strengths',
  'improvements',
  'next_goals',
  'condition_notes',
];

export interface FeedbackFields {
  main_activity?: string;
  strengths?: string;
  improvements?: string;
  next_goals?: string;
  condition_notes?: string;
  /** 센터 수업 첨부: `file_url`과 같은 순서·개수의 표시용 원본 파일명(한글 등) */
  center_document_names?: string[];
}

/** 스토리지 URL + 선택적 `center_document_names`로 목록에 보일 파일명 */
export function sessionFileDisplayName(
  url: string,
  index: number,
  centerDocumentNames?: string[] | null,
): string {
  const list = centerDocumentNames;
  if (Array.isArray(list) && typeof list[index] === 'string') {
    const t = list[index]!.trim();
    if (t.length > 0) return t.slice(0, 300);
  }
  const raw = url.split('/').pop() || '';
  const withoutQuery = raw.split('?')[0];
  let decoded = withoutQuery;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    /* keep withoutQuery */
  }
  const withoutPrefix = decoded.replace(/^\d+_/, '');
  return withoutPrefix || 'File';
}

/** 저장/다운로드 대화상자용 — 경로·금지 문자 제거 */
export function sanitizeFileNameForDownload(name: string): string {
  const n = name.normalize('NFC').trim().slice(0, 200);
  const cleaned = n.replace(/[/\\?*:"<>|]/g, '_').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : 'download';
}

/**
 * 센터 첨부: UI와 동일한 표시명을 다운로드 파일명으로 쓰되,
 * 표시명에 확장자가 없으면 스토리지 URL 경로의 확장자를 붙인다.
 */
export function displayNameForDownload(
  url: string,
  index: number,
  centerDocumentNames?: string[] | null,
): string {
  const base = sessionFileDisplayName(url, index, centerDocumentNames);
  if (/\.\w{2,10}$/i.test(base)) {
    return sanitizeFileNameForDownload(base);
  }
  const raw = url.split('/').pop() || '';
  const withoutQuery = raw.split('?')[0];
  let decoded = withoutQuery;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    /* keep withoutQuery */
  }
  const extMatch = decoded.match(/(\.[a-zA-Z0-9]{2,10})$/);
  if (extMatch) {
    return sanitizeFileNameForDownload(`${base}${extMatch[1]}`);
  }
  return sanitizeFileNameForDownload(base);
}

/** 세션 로드 시 `file_url` 길이에 맞춰 표시용 이름 배열 정렬 */
export function alignCenterDocumentNamesWithUrls(urls: string[], names?: unknown): string[] {
  const n = urls.length;
  if (!Array.isArray(names) || names.length !== n) {
    return urls.map((u, i) => sessionFileDisplayName(u, i, null));
  }
  return names.map((x, i) => {
    const s = String(x).trim().slice(0, 300);
    return s.length > 0 ? s : sessionFileDisplayName(urls[i]!, i, null);
  });
}

export interface CompletionStatus {
  required_fields: string[];
  completed_fields: string[];
  required_photos: number;
  uploaded_photos: number;
  completion_rate: number;
}

export interface SessionWithFeedback {
  feedback_fields?: FeedbackFields;
  photo_url?: string[];
  file_url?: string[];
  status?: string;
  /** 센터 수업(regular_center, one_day_center)은 파일만 올려도 작성완료(done)로 간주 */
  session_type?: 'regular_center' | 'regular_private' | 'one_day' | 'one_day_center' | 'one_day_private';
}

/**
 * 필드가 유효한지 체크 (최소 5자 이상)
 */
export function isFieldValid(value?: string): boolean {
  return !!value && value.trim().length > 5;
}

/**
 * 피드백 완료 상태 계산 (간소화 버전 - 사진 선택사항)
 */
export function calculateCompletionStatus(
  feedbackFields: FeedbackFields = {},
  photoUrls: string[] = [],
  requiredPhotos: number = 0  // 사진은 선택사항
): CompletionStatus {
  const requiredFields = FEEDBACK_TEXT_FIELD_KEYS;

  const completedFields = requiredFields.filter((field) => isFieldValid(feedbackFields[field]));
  
  const uploadedPhotos = photoUrls.length;
  const completionRate = Math.round((completedFields.length / requiredFields.length) * 100);
  
  return {
    required_fields: [...requiredFields],
    completed_fields: [...completedFields],
    required_photos: requiredPhotos,
    uploaded_photos: uploadedPhotos,
    completion_rate: completionRate
  };
}

/**
 * 세션이 제출 가능한 상태인지 검증 (사진 필수 제거)
 */
export function validateSessionCompletion(
  feedbackFields: FeedbackFields = {},
  photoUrls: string[] = []
): {
  isValid: boolean;
  message: string;
  missingFields: string[];
} {
  const status = calculateCompletionStatus(feedbackFields, photoUrls);
  const missingFields = status.required_fields.filter(
    field => !status.completed_fields.includes(field)
  );
  
  if (missingFields.length > 0) {
    const fieldNames = {
      main_activity: '오늘 수업의 주요 활동',
      strengths: '강점 및 긍정적인 부분',
      improvements: '개선이 필요한 부분 및 피드백',
      next_goals: '다음 수업 목표 및 계획',
      condition_notes: '특이사항 및 시작/종료 시간',
    };
    
    const missingFieldNames = missingFields.map(
      f => fieldNames[f as keyof typeof fieldNames]
    ).join(', ');
    
    return {
      isValid: false,
      message: `다음 필드를 작성해주세요: ${missingFieldNames}`,
      missingFields
    };
  }
  
  // 사진은 선택사항이므로 체크하지 않음
  return {
    isValid: true,
    message: '모든 항목이 완료되었습니다!',
    missingFields: []
  };
}

/**
 * 기존 템플릿 형식의 텍스트를 구조화된 필드로 파싱
 */
export function parseTemplateToFields(studentsText: string): FeedbackFields {
  const FEEDBACK_TEMPLATE = `✅ 오늘 수업의 주요 활동
- 

✅ 강점 및 긍정적인 부분
- 

✅ 개선이 필요한 부분 및 피드백
- 

✅ 다음 수업 목표 및 계획
- 

✅ 특이사항 및 시작/종료 시간
- `;

  if (studentsText === FEEDBACK_TEMPLATE || !studentsText) {
    return {};
  }

  const extractField = (text: string, startMarker: string, endMarker?: string): string => {
    const startRegex = new RegExp(`${startMarker}\\s*-\\s*`, 'i');
    const match = text.match(startRegex);
    if (!match) return '';
    
    const startIndex = match.index! + match[0].length;
    let content = '';
    
    if (endMarker) {
      const endRegex = new RegExp(`\\s*${endMarker}`, 'i');
      const endMatch = text.slice(startIndex).match(endRegex);
      content = endMatch 
        ? text.slice(startIndex, startIndex + endMatch.index!)
        : text.slice(startIndex);
    } else {
      content = text.slice(startIndex);
    }
    
    return content.trim();
  };

  return {
    main_activity: extractField(studentsText, '✅ 오늘 수업의 주요 활동', '✅ 강점 및 긍정적인 부분'),
    strengths: extractField(studentsText, '✅ 강점 및 긍정적인 부분', '✅ 개선이 필요한 부분'),
    improvements: extractField(studentsText, '✅ 개선이 필요한 부분 및 피드백', '✅ 다음 수업 목표 및 계획'),
    next_goals: extractField(studentsText, '✅ 다음 수업 목표 및 계획', '✅ 특이사항 및 시작/종료 시간'),
    condition_notes: extractField(studentsText, '✅ 특이사항 및 시작/종료 시간')
  };
}

/**
 * 구조화된 필드를 템플릿 형식의 텍스트로 변환 (하위 호환성)
 */
export function fieldsToTemplateText(fields: FeedbackFields): string {
  return `✅ 오늘 수업의 주요 활동
- ${fields.main_activity || ''}

✅ 강점 및 긍정적인 부분
- ${fields.strengths || ''}

✅ 개선이 필요한 부분 및 피드백
- ${fields.improvements || ''}

✅ 다음 수업 목표 및 계획
- ${fields.next_goals || ''}

✅ 특이사항 및 시작/종료 시간
- ${fields.condition_notes || ''}`;
}

/**
 * 세션의 표시용 상태 판별 (admin/teachers-classes용)
 * 센터 수업(regular_center)은 파일만 1개 이상 올리면 작성완료(done)로 간주.
 */
export function getSessionDisplayStatus(session: SessionWithFeedback): 'empty' | 'done' | 'verified' {
  if (session.status === 'verified') return 'verified';

  const fileUrls = session.file_url ?? [];
  const isCenterCondition =
    session.session_type === 'regular_center' || session.session_type === 'one_day_center';
  if (isCenterCondition && fileUrls.length > 0) return 'done';

  const feedbackFields = session.feedback_fields || {};
  const requiredFields = FEEDBACK_TEXT_FIELD_KEYS;

  const hasContent = requiredFields.every((field) => isFieldValid(feedbackFields[field]));

  return hasContent ? 'done' : 'empty';
}
