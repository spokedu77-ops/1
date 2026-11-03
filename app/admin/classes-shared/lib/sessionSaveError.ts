/** Shared by single and bulk saves; metadata failures are never schedule conflicts. */
export function sessionSaveErrorMessage(code: string): string | null {
  if (code.includes('SESSION_SCHEDULE_METADATA_INVALID')) return '같은 시간대 수업의 강사 정보가 손상되어 중복 여부를 확인할 수 없습니다. 해당 수업의 보조강사 정보를 확인해 주세요. 입력 내용은 유지했습니다.';
  if (code.includes('SESSION_COUNT_EXTRA_TEACHERS_INVALID') || code.includes('SESSION_UPDATE_METADATA_INVALID') || code.includes('SESSION_METADATA_')) return '보조강사 정보가 올바르지 않습니다. 강사를 선택하거나 빈 항목을 삭제한 뒤 저장해 주세요. 입력 내용은 유지했습니다.';
  if (code.includes('TEACHER_SCHEDULE_CONFLICT')) return '메인·보조강사의 다른 수업과 시간이 겹칩니다. 입력 내용은 유지했습니다.';
  return null;
}
