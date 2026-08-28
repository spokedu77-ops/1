/**
 * MOVE TRACK session child record validation (API layer).
 * observation_opportunity_band NULL rules — DB hard constraint 아님 (Rev.2 #1).
 */

export type ObservationOpportunityBand = 'one' | 'two' | 'three_plus';

export type FrwStatus = 'exploratory' | 'observed_stable' | 'not_determined';

export type SessionChildRecordInput = {
  attendance_status: 'present' | 'absent';
  absence_reason?: string | null;
  observation_opportunity_band?: ObservationOpportunityBand | null;
  participation_level?: number | null;
  support_level?: number | null;
  independent_initiation?: number | null;
  self_reengagement?: boolean | null;
  spomove_used?: boolean | null;
  frw_seconds?: number | null;
  frw_status?: FrwStatus | null;
  observation_note?: string | null;
};

export type ValidationIssue = { field: string; message: string; code: string };

const STRUCTURED_OBSERVED_FIELDS = [
  'participation_level',
  'support_level',
  'independent_initiation',
  'self_reengagement',
] as const;

function hasStructuredObservedValue(input: SessionChildRecordInput): boolean {
  return (
    input.participation_level != null
    || input.support_level != null
    || input.independent_initiation != null
    || input.self_reengagement != null
    || input.spomove_used != null
    || input.frw_seconds != null
    || input.frw_status != null
  );
}

/** Growth/Impact eligibility — frw_seconds=1 Challenge excluded */
export function isFrwGrowthPhaseEligible(seconds: number | null | undefined, status: FrwStatus | null | undefined): boolean {
  if (seconds == null || status == null) return false;
  return seconds >= 2 && seconds <= 6 && status === 'observed_stable';
}

export function validateSessionChildRecord(input: SessionChildRecordInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (input.attendance_status === 'absent') {
    if (hasStructuredObservedValue(input)) {
      issues.push({
        field: 'attendance_status',
        code: 'absent_structured_fields',
        message: '결석 시 구조화 관찰값은 입력할 수 없습니다.',
      });
    }
    return issues;
  }

  // SM-02 / Rev.2 #1: band NULL → structured fields should be NULL (API, not DB CHECK)
  if (input.observation_opportunity_band == null) {
    if (hasStructuredObservedValue(input)) {
      issues.push({
        field: 'observation_opportunity_band',
        code: 'band_null_structured_present',
        message: '참여기회를 평가하지 않은 경우 구조화 관찰값은 NULL이어야 합니다.',
      });
    }
    return issues;
  }

  const rangeChecks: Array<{ field: keyof SessionChildRecordInput; min: number; max: number }> = [
    { field: 'participation_level', min: 0, max: 4 },
    { field: 'support_level', min: 0, max: 4 },
    { field: 'independent_initiation', min: 0, max: 3 },
  ];

  for (const { field, min, max } of rangeChecks) {
    const v = input[field];
    if (v == null) continue;
    if (typeof v !== 'number' || v < min || v > max) {
      issues.push({ field, code: 'out_of_range', message: `${field} must be NULL or ${min}-${max}` });
    }
  }

  if (input.spomove_used === false) {
    if (input.frw_seconds != null || input.frw_status != null) {
      issues.push({
        field: 'frw_seconds',
        code: 'frw_without_spomove',
        message: 'SPOMOVE 미실시 시 FRW 필드는 NULL이어야 합니다.',
      });
    }
  } else if (input.spomove_used === true) {
    const hasFrw = input.frw_seconds != null || input.frw_status != null;
    if (hasFrw && (input.frw_seconds == null || input.frw_status == null)) {
      issues.push({
        field: 'frw_seconds',
        code: 'frw_pair_required',
        message: 'frw_seconds와 frw_status는 함께 입력해야 합니다.',
      });
    }
    if (input.frw_seconds != null && (input.frw_seconds < 1 || input.frw_seconds > 6)) {
      issues.push({ field: 'frw_seconds', code: 'frw_range', message: 'frw_seconds는 1-6입니다.' });
    }
  }

  if (input.observation_note != null && input.observation_note.length > 150) {
    issues.push({ field: 'observation_note', code: 'note_length', message: 'observation_note는 150자 이하입니다.' });
  }

  // Quality warnings (non-blocking) returned separately in API — optional flags
  if (input.participation_level === 0 && (input.independent_initiation ?? 0) >= 2) {
    issues.push({
      field: 'quality',
      code: 'participation_initiation_mismatch',
      message: '참여 수준과 독립적 시작 기록이 다르게 해석될 수 있습니다.',
    });
  }

  return issues;
}

export function partitionValidationIssues(issues: ValidationIssue[]): {
  blocking: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const warnings = issues.filter((i) => i.code === 'participation_initiation_mismatch');
  const blocking = issues.filter((i) => i.code !== 'participation_initiation_mismatch');
  return { blocking, warnings };
}
