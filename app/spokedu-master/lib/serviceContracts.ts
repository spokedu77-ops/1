import type { ClassRecord, StudentProfile, UserProfile } from '../types';
import { createParentPreviewToken } from './subscription';

export type ServiceFailureCode =
  | 'offline'
  | 'permission-denied'
  | 'subscription-expired'
  | 'monthly-limit-exceeded'
  | 'kakao-provider-error'
  | 'pdf-render-failed'
  | 'token-expired';

export type ApiResult<T> =
  | { ok: true; data: T; queued?: boolean }
  | { ok: false; code: ServiceFailureCode; message: string; retryable: boolean };

export type RetryQueueItem = {
  id: string;
  type: 'kakao-summary' | 'pdf-report' | 'class-record-sync';
  title: string;
  createdAt: string;
  retryable: boolean;
};

export type KakaoSummaryRequest = {
  centerId: string | null;
  senderId: string;
  classRecord: ClassRecord;
  students: StudentProfile[];
};

export type KakaoSummaryResult = {
  sentCount: number;
  failedCount: number;
  parentLinks: Array<{
    studentId: string;
    studentName: string;
    token: string;
    expiresAt: string;
  }>;
};

export type GrowthReportRequest = {
  profile: UserProfile | null;
  classId: string;
  period: string;
  students: StudentProfile[];
  records: ClassRecord[];
};

export type GrowthReportResult = {
  reportBatchId: string;
  pdfCount: number;
  kakaoReadyCount: number;
  parentLinks: Array<{
    studentId: string;
    token: string;
  }>;
};

export const FIREBASE_COLLECTIONS = {
  users: 'users',
  centers: 'centers',
  programs: 'programs',
  classRecords: 'classRecords',
  students: 'students',
  reports: 'reports',
  parentTokens: 'parentTokens',
  billingEvents: 'billingEvents',
} as const;

export const CLOUD_FUNCTIONS = {
  validateCenterCode: 'validateCenterCode',
  saveClassRecord: 'saveClassRecord',
  sendKakaoClassSummary: 'sendKakaoClassSummary',
  createParentShareToken: 'createParentShareToken',
  generateGrowthReportPdf: 'generateGrowthReportPdf',
  retryFailedJob: 'retryFailedJob',
} as const;

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function buildRetryQueueItem(type: RetryQueueItem['type'], title: string, retryable = true): RetryQueueItem {
  return {
    id: `${type}-${Date.now()}`,
    type,
    title,
    createdAt: new Date().toISOString(),
    retryable,
  };
}

export async function sendKakaoClassSummary(request: KakaoSummaryRequest): Promise<ApiResult<KakaoSummaryResult>> {
  await wait(650);
  const presentStudents = request.students.filter((student) => request.classRecord.students.some((record) => record.studentId === student.id && record.attendance === 'present'));
  const parentLinks = presentStudents.map((student) => {
    const token = createParentPreviewToken(student.id);
    const expiresAt = new Date(Number(token.split('.')[2])).toISOString();
    return { studentId: student.id, studentName: student.name, token, expiresAt };
  });

  return {
    ok: true,
    data: {
      sentCount: parentLinks.length,
      failedCount: 0,
      parentLinks,
    },
  };
}

export async function generateGrowthReportBatch(request: GrowthReportRequest): Promise<ApiResult<GrowthReportResult>> {
  await wait(750);
  const parentLinks = request.students.map((student) => ({
    studentId: student.id,
    token: createParentPreviewToken(student.id),
  }));

  return {
    ok: true,
    data: {
      reportBatchId: `report-${Date.now()}`,
      pdfCount: request.students.length,
      kakaoReadyCount: request.students.length,
      parentLinks,
    },
  };
}
