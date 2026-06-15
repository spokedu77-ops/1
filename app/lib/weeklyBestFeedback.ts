import type { FeedbackFields } from '@/app/lib/feedbackValidation';
import { sessionFileDisplayName } from '@/app/lib/feedbackValidation';
import { isCenterSessionType } from '@/app/admin/classes-v2/lib/sessionTypeCategory';

export type WeeklyBestFeedbackSession = {
  session_type?: string | null;
  file_url?: string[] | null;
  feedback_fields?: FeedbackFields | null;
  students_text?: string | null;
};

export function normalizeSessionFileUrls(fileUrl: unknown): string[] {
  if (!Array.isArray(fileUrl)) return [];
  return fileUrl.filter((u): u is string => typeof u === 'string' && !!u.trim());
}

export function formatFeedbackFieldsForDisplay(f: FeedbackFields): string {
  const parts: string[] = [];
  if (f.main_activity) parts.push(`✅ 주요 활동\n${f.main_activity}`);
  if (f.strengths) parts.push(`✅ 강점\n${f.strengths}`);
  if (f.improvements) parts.push(`✅ 개선점\n${f.improvements}`);
  if (f.next_goals) parts.push(`✅ 다음 목표\n${f.next_goals}`);
  if (f.condition_notes) parts.push(`✅ 특이사항 및 시작/종료 시간\n${f.condition_notes}`);
  return parts.join('\n\n');
}

export function formatWeeklyBestFeedbackText(
  feedbackNote: string | null | undefined,
  session: WeeklyBestFeedbackSession | null | undefined,
): string | null {
  const note = typeof feedbackNote === 'string' ? feedbackNote.trim() : '';
  if (note) return note;

  if (!session) return null;

  const studentsText = typeof session.students_text === 'string' ? session.students_text.trim() : '';
  if (studentsText) return studentsText;

  const fileUrls = normalizeSessionFileUrls(session.file_url);
  const ff = session.feedback_fields ?? {};

  if (isCenterSessionType(session.session_type) && fileUrls.length > 0) {
    const names = fileUrls.map((url, i) =>
      sessionFileDisplayName(url, i, ff.center_document_names ?? null),
    );
    return `📎 센터 피드백 첨부\n${names.map((n) => `· ${n}`).join('\n')}`;
  }

  if (session.feedback_fields) {
    const text = formatFeedbackFieldsForDisplay(session.feedback_fields);
    if (text) return text;
  }

  return null;
}
