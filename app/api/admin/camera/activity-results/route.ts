import { NextResponse } from 'next/server';
import { CAMERA_MODE_IDS, DIFF } from '@/app/admin/camera/constants';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import type {
  CameraActivityParticipantDraft,
  CameraActivityResultSummary,
  CameraActivitySavePayload,
  CameraActivitySessionDraft,
  CameraParticipantMode,
} from '@/app/admin/camera/types';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)
    ? trimmed
    : null;
}

function cleanIso(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function cleanParticipantMode(value: unknown): CameraParticipantMode {
  return value === 'solo' || value === 'multi' || value === 'team' || value === 'unknown'
    ? value
    : 'unknown';
}

function validateSession(value: unknown, userId: string): CameraActivitySessionDraft | null {
  if (!isRecord(value)) return null;
  const mode = value.mode;
  const difficulty = value.difficulty;
  const durationSec = Number(value.durationSec);

  if (typeof mode !== 'string' || !CAMERA_MODE_IDS.includes(mode as never)) return null;
  if (typeof difficulty !== 'string' || !(difficulty in DIFF)) return null;
  if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > 600) return null;

  return {
    centerId: cleanUuid(value.centerId),
    teacherId: cleanUuid(value.teacherId) ?? userId,
    classId: cleanUuid(value.classId),
    lessonSessionId: cleanUuid(value.lessonSessionId),
    source: value.source === 'controller' || value.source === 'demo' || value.source === 'import' ? value.source : 'player',
    mode: mode as CameraActivitySessionDraft['mode'],
    difficulty: difficulty as CameraActivitySessionDraft['difficulty'],
    durationSec,
    participantMode: cleanParticipantMode(value.participantMode),
    settings: isRecord(value.settings) ? value.settings as CameraActivitySessionDraft['settings'] : {
      diff: difficulty as CameraActivitySessionDraft['difficulty'],
      dur: durationSec,
      multiOn: cleanParticipantMode(value.participantMode) !== 'solo',
      soundOn: true,
    },
    metrics: isRecord(value.metrics) ? value.metrics as CameraActivitySessionDraft['metrics'] : {
      totalScore: 0,
      avgReactionMs: null,
      hitCount: 0,
      activeParticipants: 1,
    },
    device: isRecord(value.device) ? value.device as CameraActivitySessionDraft['device'] : null,
    startedAt: cleanIso(value.startedAt),
    endedAt: cleanIso(value.endedAt),
  };
}

function validateParticipants(value: unknown): CameraActivityParticipantDraft[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .slice(0, 12)
    .map((item, index) => ({
      studentId: cleanUuid(item.studentId),
      teamId: typeof item.teamId === 'string' && item.teamId.trim() ? item.teamId.trim().slice(0, 80) : null,
      slotIndex: Number.isFinite(Number(item.slotIndex)) ? Number(item.slotIndex) : index,
      displayName: typeof item.displayName === 'string' ? item.displayName.trim().slice(0, 80) : null,
      score: Math.max(0, Math.round(Number(item.score) || 0)),
      avgReactionMs: item.avgReactionMs != null && Number.isFinite(Number(item.avgReactionMs))
        ? Math.max(0, Math.round(Number(item.avgReactionMs)))
        : null,
      hitCount: Math.max(0, Math.round(Number(item.hitCount) || 0)),
      missCount: item.missCount != null && Number.isFinite(Number(item.missCount))
        ? Math.max(0, Math.round(Number(item.missCount)))
        : null,
      metrics: isRecord(item.metrics) ? item.metrics : {},
    }));
}

type ResultRow = {
  id: string;
  mode: CameraActivityResultSummary['mode'];
  difficulty: CameraActivityResultSummary['difficulty'];
  duration_sec: number;
  participant_mode: CameraParticipantMode;
  metrics: CameraActivityResultSummary['metrics'];
  created_at: string;
  camera_activity_participants?: Array<{ score: number | null }>;
};

function mapResultRow(row: ResultRow): CameraActivityResultSummary {
  const scores = (row.camera_activity_participants ?? []).map((p) => Number(p.score) || 0);
  return {
    id: row.id,
    mode: row.mode,
    difficulty: row.difficulty,
    durationSec: row.duration_sec,
    participantMode: row.participant_mode,
    metrics: row.metrics,
    createdAt: row.created_at,
    participantCount: Math.max(1, scores.length || row.metrics?.activeParticipants || 1),
    topScore: scores.length ? Math.max(...scores) : Number(row.metrics?.totalScore) || 0,
  };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get('limit') ?? 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.round(limitParam), 1), 30) : 10;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('camera_activity_sessions')
    .select(`
      id,
      mode,
      difficulty,
      duration_sec,
      participant_mode,
      metrics,
      created_at,
      camera_activity_participants(score)
    `)
    .eq('created_by', auth.userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    results: ((data ?? []) as ResultRow[]).map(mapResultRow),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null) as Partial<CameraActivitySavePayload> | null;
  const session = validateSession(body?.session, auth.userId);
  const participants = validateParticipants(body?.participants);

  if (!session) return NextResponse.json({ error: 'valid session is required' }, { status: 400 });
  if (participants.length === 0) return NextResponse.json({ error: 'at least one participant is required' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { data: savedSession, error: sessionError } = await supabase
    .from('camera_activity_sessions')
    .insert({
      center_id: session.centerId,
      teacher_id: session.teacherId,
      class_id: session.classId,
      lesson_session_id: session.lessonSessionId,
      source: session.source,
      mode: session.mode,
      difficulty: session.difficulty,
      duration_sec: session.durationSec,
      participant_mode: session.participantMode,
      settings: session.settings,
      metrics: session.metrics,
      device: session.device,
      started_at: session.startedAt,
      ended_at: session.endedAt,
      created_by: auth.userId,
    })
    .select('id, created_at')
    .single();

  if (sessionError || !savedSession) {
    return NextResponse.json({ error: sessionError?.message ?? 'Failed to save activity session' }, { status: 500 });
  }

  const participantRows = participants.map((participant) => ({
    session_id: savedSession.id,
    student_id: participant.studentId,
    team_id: participant.teamId,
    slot_index: participant.slotIndex,
    display_name: participant.displayName,
    score: participant.score,
    avg_reaction_ms: participant.avgReactionMs,
    hit_count: participant.hitCount,
    miss_count: participant.missCount,
    metrics: participant.metrics ?? {},
  }));

  const { error: participantError } = await supabase
    .from('camera_activity_participants')
    .insert(participantRows);

  if (participantError) {
    await supabase.from('camera_activity_sessions').delete().eq('id', savedSession.id);
    return NextResponse.json({ error: participantError.message }, { status: 500 });
  }

  return NextResponse.json({
    session: {
      id: savedSession.id,
      createdAt: savedSession.created_at,
    },
  }, { status: 201 });
}
