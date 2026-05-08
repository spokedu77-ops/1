import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { CAMERA_MODE_IDS } from '@/app/admin/camera/constants';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import type {
  CameraControlEnvelope,
  CameraControllerCommand,
  CameraControllerStateSnapshot,
  CameraPlayerStateSnapshot,
} from '@/app/admin/camera/types';

export const runtime = 'nodejs';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

type ControlSessionRow = {
  id: string;
  code: string;
  status: 'waiting' | 'paired' | 'active' | 'ended' | 'expired';
  player_state: unknown;
  controller_state: unknown;
  last_command: unknown;
  last_command_id: string | null;
  last_ack_command_id: string | null;
  expires_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return code;
}

function expiresAt(): string {
  return new Date(Date.now() + SESSION_TTL_MS).toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeCode(value: unknown): string {
  return typeof value === 'string'
    ? value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    : '';
}

function mapRow(row: ControlSessionRow) {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    playerState: row.player_state,
    controllerState: row.controller_state,
    lastCommand: row.last_command,
    lastCommandId: row.last_command_id,
    lastAckCommandId: row.last_ack_command_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateCommand(value: unknown): CameraControllerCommand | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;
  const type = value.type;
  if (
    type === 'start' ||
    type === 'pause' ||
    type === 'resume' ||
    type === 'end' ||
    type === 'reset'
  ) {
    return { type };
  }
  if (type === 'selectMode' && typeof value.mode === 'string') {
    const mode = value.mode;
    if (CAMERA_MODE_IDS.includes(mode as never)) {
      return { type, mode: mode as (typeof CAMERA_MODE_IDS)[number] };
    }
  }
  if (
    type === 'applyContentPack' &&
    typeof value.packId === 'string' &&
    typeof value.mode === 'string' &&
    isRecord(value.settings)
  ) {
    const mode = value.mode;
    if (CAMERA_MODE_IDS.includes(mode as never)) {
      return {
        type,
        packId: value.packId,
        mode: mode as (typeof CAMERA_MODE_IDS)[number],
        settings: value.settings,
      };
    }
  }
  if (type === 'updateSettings' && isRecord(value.settings)) {
    return { type, settings: value.settings };
  }
  return null;
}

async function fetchOwnedSession(id: string, userId: string) {
  const supabase = getServiceSupabase();
  return supabase
    .from('camera_control_sessions')
    .select('*')
    .eq('id', id)
    .eq('created_by', userId)
    .maybeSingle();
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';
  const code = normalizeCode(url.searchParams.get('code'));

  if (!id && !code) {
    return NextResponse.json({ error: 'id or code is required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const query = supabase
    .from('camera_control_sessions')
    .select('*')
    .eq('created_by', auth.userId)
    .gt('expires_at', new Date().toISOString());

  const { data, error } = id
    ? await query.eq('id', id).maybeSingle()
    : await query.eq('code', code).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  return NextResponse.json({ session: mapRow(data as ControlSessionRow) });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const action = isRecord(body) && typeof body.action === 'string' ? body.action : '';
  const supabase = getServiceSupabase();

  if (action === 'create') {
    const playerState = isRecord(body?.playerState) ? body.playerState : {};
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 10; attempt++) {
      const code = generateCode();
      const { data, error } = await supabase
        .from('camera_control_sessions')
        .insert({
          code,
          status: 'waiting',
          player_state: playerState,
          expires_at: expiresAt(),
          created_by: auth.userId,
        })
        .select('*')
        .single();

      if (!error && data) {
        return NextResponse.json({ session: mapRow(data as ControlSessionRow) }, { status: 201 });
      }

      lastError = error;
      if ((error as { code?: string } | null)?.code === '23505') continue;
      break;
    }

    return NextResponse.json(
      { error: 'Failed to create control session', details: String((lastError as Error | null)?.message ?? lastError) },
      { status: 500 }
    );
  }

  if (action === 'join') {
    const code = normalizeCode(body?.code);
    if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 });

    const controllerState = isRecord(body?.controllerState) ? body.controllerState : {};
    const { data, error } = await supabase
      .from('camera_control_sessions')
      .update({
        status: 'paired',
        controller_state: controllerState,
        updated_at: new Date().toISOString(),
      })
      .eq('code', code)
      .eq('created_by', auth.userId)
      .in('status', ['waiting', 'paired', 'active'])
      .gt('expires_at', new Date().toISOString())
      .select('*')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    return NextResponse.json({ session: mapRow(data as ControlSessionRow) });
  }

  if (action === 'command') {
    const id = typeof body?.id === 'string' ? body.id : '';
    const command = validateCommand(body?.command);
    const controllerState = isRecord(body?.controllerState)
      ? (body.controllerState as unknown as CameraControllerStateSnapshot)
      : null;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    if (!command) return NextResponse.json({ error: 'valid command is required' }, { status: 400 });

    const commandId =
      typeof body?.commandId === 'string' && body.commandId
        ? body.commandId
        : crypto.randomUUID();
    const envelope: CameraControlEnvelope = {
      commandId,
      issuedAt: new Date().toISOString(),
      command,
    };

    const { data, error } = await supabase
      .from('camera_control_sessions')
      .update({
        status: command.type === 'end' ? 'ended' : 'active',
        controller_state: controllerState,
        last_command: envelope,
        last_command_id: commandId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('created_by', auth.userId)
      .gt('expires_at', new Date().toISOString())
      .select('*')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    return NextResponse.json({ session: mapRow(data as ControlSessionRow) });
  }

  if (action === 'ack' || action === 'state') {
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { data: existing, error: fetchError } = await fetchOwnedSession(id, auth.userId);
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const playerState = isRecord(body?.playerState)
      ? (body.playerState as unknown as CameraPlayerStateSnapshot)
      : existing.player_state;
    const ackId = typeof body?.commandId === 'string' ? body.commandId : existing.last_ack_command_id;

    const { data, error } = await supabase
      .from('camera_control_sessions')
      .update({
        player_state: playerState,
        last_ack_command_id: action === 'ack' ? ackId : existing.last_ack_command_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('created_by', auth.userId)
      .select('*')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    return NextResponse.json({ session: mapRow(data as ControlSessionRow) });
  }

  if (action === 'end') {
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('camera_control_sessions')
      .update({ status: 'ended', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('created_by', auth.userId)
      .select('*')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    return NextResponse.json({ session: mapRow(data as ControlSessionRow) });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
