import type {
  CameraActivityMetrics,
  CameraActivityParticipantDraft,
  CameraActivitySavePayload,
  CameraActivitySessionDraft,
  CameraSettings,
  HistoryRecord,
} from './types';
import { MAX_CAMERA_PARTICIPANTS } from './constants';

export function buildActivityMetrics(record: HistoryRecord): CameraActivityMetrics {
  const scores = record.scores.slice(0, MAX_CAMERA_PARTICIPANTS).map((score) => Number(score) || 0);
  const activeParticipants = Math.max(1, scores.filter((score) => score > 0).length);

  return {
    totalScore: record.total,
    avgReactionMs: record.avgRt,
    hitCount: record.total,
    activeParticipants,
    modeSpecific: { maxTrackedParticipants: MAX_CAMERA_PARTICIPANTS },
  };
}

export function buildActivityParticipants(record: HistoryRecord): CameraActivityParticipantDraft[] {
  const slots = record.participantSlots ?? [];
  return record.scores
    .slice(0, MAX_CAMERA_PARTICIPANTS)
    .map((score, index) => ({
      studentId: slots[index]?.studentId ?? null,
      teamId: slots[index]?.teamId ?? null,
      slotIndex: index,
      displayName: slots[index]?.displayName || `P${index + 1}`,
      score: Number(score) || 0,
      avgReactionMs: index === 0 ? record.avgRt : null,
      hitCount: Number(score) || 0,
      metrics: {},
    }))
    .filter((participant, index) => index === 0 || participant.score > 0);
}

export function buildActivitySavePayloadFromRecord(
  record: HistoryRecord,
  settings: CameraSettings,
  context?: Partial<
    Pick<CameraActivitySessionDraft, 'centerId' | 'teacherId' | 'classId' | 'lessonSessionId' | 'device' | 'startedAt' | 'endedAt'>
  >
): CameraActivitySavePayload {
  const participants = buildActivityParticipants(record);

  return {
    session: {
      centerId: context?.centerId ?? null,
      teacherId: context?.teacherId ?? null,
      classId: context?.classId ?? null,
      lessonSessionId: context?.lessonSessionId ?? null,
      source: 'player',
      mode: record.mode,
      difficulty: record.diff,
      durationSec: record.dur,
      participantMode: participants.length > 1 ? 'multi' : 'solo',
      settings,
      metrics: buildActivityMetrics(record),
      device: context?.device ?? null,
      startedAt: context?.startedAt ?? null,
      endedAt: context?.endedAt ?? null,
    },
    participants,
  };
}
