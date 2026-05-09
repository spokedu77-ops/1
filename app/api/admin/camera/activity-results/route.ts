import { NextResponse } from 'next/server';
import { CAMERA_MODE_IDS, DIFF, MAX_CAMERA_PARTICIPANTS } from '@/app/admin/camera/constants';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import type {
  CameraActivityDeviceInfo,
  CameraActivityMetrics,
  CameraActivityParticipantDraft,
  CameraActivityResultDetail,
  CameraActivityResultParticipant,
  CameraActivityResultSummary,
  CameraActivitySavePayload,
  CameraActivitySessionDraft,
  CameraParticipantMode,
  CameraSettings,
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

function cleanSettings(
  value: unknown,
  fallback: Pick<CameraSettings, 'diff' | 'dur' | 'multiOn'>
): CameraSettings {
  if (!isRecord(value)) {
    return { ...fallback, soundOn: true };
  }

  const diff = typeof value.diff === 'string' && value.diff in DIFF
    ? value.diff as CameraSettings['diff']
    : fallback.diff;
  const dur = Number.isFinite(Number(value.dur)) ? Number(value.dur) : fallback.dur;

  return {
    diff,
    dur,
    multiOn: typeof value.multiOn === 'boolean' ? value.multiOn : fallback.multiOn,
    soundOn: typeof value.soundOn === 'boolean' ? value.soundOn : true,
    participantSlots: cleanParticipantSlots(value.participantSlots),
  };
}

function cleanParticipantSlots(value: unknown): CameraSettings['participantSlots'] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .slice(0, MAX_CAMERA_PARTICIPANTS)
    .map((item, index) => ({
      slotIndex: Number.isFinite(Number(item.slotIndex)) ? Number(item.slotIndex) : index,
      displayName: typeof item.displayName === 'string' ? item.displayName.trim().slice(0, 80) : '',
      studentId: cleanUuid(item.studentId),
      teamId: typeof item.teamId === 'string' && item.teamId.trim() ? item.teamId.trim().slice(0, 80) : null,
    }));
}

function cleanMetrics(value: unknown): CameraActivityMetrics {
  if (!isRecord(value)) {
    return {
      totalScore: 0,
      avgReactionMs: null,
      hitCount: 0,
      activeParticipants: 1,
      modeSpecific: {},
    };
  }

  return {
    totalScore: Math.max(0, Math.round(Number(value.totalScore) || 0)),
    avgReactionMs: value.avgReactionMs != null && Number.isFinite(Number(value.avgReactionMs))
      ? Math.max(0, Math.round(Number(value.avgReactionMs)))
      : null,
    hitCount: Math.max(0, Math.round(Number(value.hitCount) || 0)),
    missCount: value.missCount != null && Number.isFinite(Number(value.missCount))
      ? Math.max(0, Math.round(Number(value.missCount)))
      : null,
    comboMax: value.comboMax != null && Number.isFinite(Number(value.comboMax))
      ? Math.max(0, Math.round(Number(value.comboMax)))
      : null,
    activeParticipants: Math.max(1, Math.round(Number(value.activeParticipants) || 1)),
    lateGameScoreRate: value.lateGameScoreRate != null && Number.isFinite(Number(value.lateGameScoreRate))
      ? Number(value.lateGameScoreRate)
      : null,
    leftRightBalance: isRecord(value.leftRightBalance)
      ? {
          leftHits: Math.max(0, Math.round(Number(value.leftRightBalance.leftHits) || 0)),
          rightHits: Math.max(0, Math.round(Number(value.leftRightBalance.rightHits) || 0)),
          differenceRate: value.leftRightBalance.differenceRate != null && Number.isFinite(Number(value.leftRightBalance.differenceRate))
            ? Number(value.leftRightBalance.differenceRate)
            : null,
        }
      : null,
    modeSpecific: isRecord(value.modeSpecific) ? value.modeSpecific : {},
  };
}

function cleanDevice(value: unknown): CameraActivityDeviceInfo | null {
  if (!isRecord(value)) return null;
  return {
    role: value.role === 'controller' ? 'controller' : 'player',
    viewport: isRecord(value.viewport) ? {
      width: Math.max(0, Math.round(Number(value.viewport.width) || 0)),
      height: Math.max(0, Math.round(Number(value.viewport.height) || 0)),
    } : undefined,
    screen: isRecord(value.screen) ? {
      width: Math.max(0, Math.round(Number(value.screen.width) || 0)),
      height: Math.max(0, Math.round(Number(value.screen.height) || 0)),
    } : undefined,
    userAgent: typeof value.userAgent === 'string' ? value.userAgent.slice(0, 500) : undefined,
    camera: isRecord(value.camera) ? {
      facingMode: typeof value.camera.facingMode === 'string' ? value.camera.facingMode.slice(0, 80) : undefined,
      videoWidth: Number.isFinite(Number(value.camera.videoWidth)) ? Math.max(0, Math.round(Number(value.camera.videoWidth))) : undefined,
      videoHeight: Number.isFinite(Number(value.camera.videoHeight)) ? Math.max(0, Math.round(Number(value.camera.videoHeight))) : undefined,
    } : undefined,
    pose: isRecord(value.pose) ? {
      model: typeof value.pose.model === 'string' ? value.pose.model.slice(0, 120) : undefined,
      delegate: value.pose.delegate === 'CPU' || value.pose.delegate === 'GPU' ? value.pose.delegate : undefined,
    } : undefined,
  };
}

function validateSession(value: unknown, userId: string): CameraActivitySessionDraft | null {
  if (!isRecord(value)) return null;
  const mode = value.mode;
  const difficulty = value.difficulty;
  const durationSec = Number(value.durationSec);

  if (typeof mode !== 'string' || !CAMERA_MODE_IDS.includes(mode as never)) return null;
  if (typeof difficulty !== 'string' || !(difficulty in DIFF)) return null;
  if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > 600) return null;
  const participantMode = cleanParticipantMode(value.participantMode);
  const fallbackSettings = {
    diff: difficulty as CameraActivitySessionDraft['difficulty'],
    dur: durationSec,
    multiOn: participantMode !== 'solo',
  };

  return {
    centerId: cleanUuid(value.centerId),
    teacherId: cleanUuid(value.teacherId) ?? userId,
    classId: cleanUuid(value.classId),
    lessonSessionId: cleanUuid(value.lessonSessionId),
    source: value.source === 'controller' || value.source === 'demo' || value.source === 'import' ? value.source : 'player',
    mode: mode as CameraActivitySessionDraft['mode'],
    difficulty: difficulty as CameraActivitySessionDraft['difficulty'],
    durationSec,
    participantMode,
    settings: cleanSettings(value.settings, fallbackSettings),
    metrics: cleanMetrics(value.metrics),
    device: cleanDevice(value.device),
    startedAt: cleanIso(value.startedAt),
    endedAt: cleanIso(value.endedAt),
  };
}

function validateParticipants(value: unknown): CameraActivityParticipantDraft[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .slice(0, MAX_CAMERA_PARTICIPANTS)
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
  source?: CameraActivitySessionDraft['source'];
  mode: CameraActivityResultSummary['mode'];
  difficulty: CameraActivityResultSummary['difficulty'];
  duration_sec: number;
  participant_mode: CameraParticipantMode;
  settings?: CameraSettings;
  metrics: CameraActivityResultSummary['metrics'];
  device?: CameraActivityDeviceInfo | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
  camera_activity_participants?: Array<{
    id?: string;
    slot_index?: number | null;
    student_id?: string | null;
    team_id?: string | null;
    display_name?: string | null;
    score: number | null;
    avg_reaction_ms?: number | null;
    hit_count?: number | null;
    miss_count?: number | null;
    metrics?: Record<string, unknown> | null;
  }>;
};

function mapParticipant(row: NonNullable<ResultRow['camera_activity_participants']>[number], index: number): CameraActivityResultParticipant {
  return {
    id: row.id ?? `${index}`,
    slotIndex: Number.isFinite(Number(row.slot_index)) ? Number(row.slot_index) : index,
    studentId: typeof row.student_id === 'string' ? row.student_id : null,
    teamId: typeof row.team_id === 'string' ? row.team_id : null,
    displayName: typeof row.display_name === 'string' && row.display_name ? row.display_name : `P${index + 1}`,
    score: Math.max(0, Math.round(Number(row.score) || 0)),
    avgReactionMs: row.avg_reaction_ms != null && Number.isFinite(Number(row.avg_reaction_ms))
      ? Math.max(0, Math.round(Number(row.avg_reaction_ms)))
      : null,
    hitCount: Math.max(0, Math.round(Number(row.hit_count) || 0)),
    missCount: row.miss_count != null && Number.isFinite(Number(row.miss_count))
      ? Math.max(0, Math.round(Number(row.miss_count)))
      : null,
    metrics: isRecord(row.metrics) ? row.metrics : {},
  };
}

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

function mapResultDetail(row: ResultRow): CameraActivityResultDetail {
  const summary = mapResultRow(row);
  const participants = (row.camera_activity_participants ?? [])
    .map(mapParticipant)
    .sort((a, b) => a.slotIndex - b.slotIndex);

  return {
    ...summary,
    source: row.source ?? 'player',
    settings: row.settings ?? {
      diff: row.difficulty,
      dur: row.duration_sec,
      multiOn: row.participant_mode !== 'solo',
      soundOn: true,
    },
    device: row.device ?? null,
    startedAt: row.started_at ?? null,
    endedAt: row.ended_at ?? null,
    participants,
    participantCount: Math.max(1, participants.length || summary.participantCount),
    topScore: participants.length ? Math.max(...participants.map((p) => p.score)) : summary.topScore,
  };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';
  const limitParam = Number(url.searchParams.get('limit') ?? 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.round(limitParam), 1), 30) : 10;

  const supabase = getServiceSupabase();
  if (id) {
    const { data, error } = await supabase
      .from('camera_activity_sessions')
      .select(`
        id,
        source,
        mode,
        difficulty,
        duration_sec,
        participant_mode,
        settings,
        metrics,
        device,
        started_at,
        ended_at,
        created_at,
        camera_activity_participants(
          id,
          slot_index,
          student_id,
          team_id,
          display_name,
          score,
          avg_reaction_ms,
          hit_count,
          miss_count,
          metrics
        )
      `)
      .eq('id', id)
      .eq('created_by', auth.userId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Result not found' }, { status: 404 });

    return NextResponse.json({ result: mapResultDetail(data as ResultRow) });
  }

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
