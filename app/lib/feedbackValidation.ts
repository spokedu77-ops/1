// ===================================================================
// 피드백 검증 로직 - 간소화 버전
// ===================================================================
// 필수: 3개 필드만, 사진은 선택사항
// ===================================================================

export interface FeedbackFields {
  main_activity?: string;
  strengths?: string;
  improvements?: string;
  next_goals?: string;
  condition_notes?: string;
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
  const requiredFields = ['main_activity', 'strengths', 'next_goals'];
  
  const completedFields = requiredFields.filter(field => 
    isFieldValid(feedbackFields[field as keyof FeedbackFields])
  );
  
  const uploadedPhotos = photoUrls.length;
  const completionRate = Math.round((completedFields.length / requiredFields.length) * 100);
  
  return {
    required_fields: requiredFields,
    completed_fields: completedFields,
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
      next_goals: '다음 수업 목표 및 계획'
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
 */
export function getSessionDisplayStatus(session: SessionWithFeedback): 'empty' | 'done' | 'verified' {
  if (session.status === 'verified') return 'verified';
  
  const feedbackFields = session.feedback_fields || {};
  const hasContent = feedbackFields.main_activity || feedbackFields.strengths || feedbackFields.next_goals;
  
  return hasContent ? 'done' : 'empty';
}
