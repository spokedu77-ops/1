import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as admin from 'firebase-admin';

function getAdminApp() {
  if (admin.apps.length > 0) return admin.app();
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON missing');
  const cred = JSON.parse(json) as admin.ServiceAccount;
  return admin.initializeApp({ credential: admin.credential.cert(cred) });
}

export async function POST(req: NextRequest) {
  const secret = process.env.SUPABASE_CHAT_PUSH_WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') || req.headers.get('x-webhook-secret');
    const token = auth?.replace(/^Bearer\s+/i, '').trim() || auth;
    if (token !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: { type?: string; table?: string; record?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const record = (body.record ?? body) as Record<string, unknown>;
  const roomId = record.room_id as string | undefined;
  const senderId = record.sender_id as string | undefined;
  const content = (record.content as string) || '';
  const messageId = record.id as string | undefined;

  if (!roomId || !senderId) {
    return NextResponse.json({ error: 'Missing room_id or sender_id' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    return NextResponse.json({ error: 'Server config missing' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRole);

  const [participantsRes, roomRes] = await Promise.all([
    supabase.from('chat_participants').select('user_id').eq('room_id', roomId).neq('user_id', senderId),
    supabase.from('chat_rooms').select('custom_name').eq('id', roomId).single(),
  ]);

  const userIds = (participantsRes.data ?? []).map((p: { user_id: string }) => p.user_id);
  if (userIds.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const { data: tokens } = await supabase.from('user_fcm_tokens').select('token').in('user_id', userIds);
  const fcmTokens = (tokens ?? []).map((t: { token: string }) => t.token).filter(Boolean);
  if (fcmTokens.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const roomName = (roomRes.data as { custom_name?: string } | null)?.custom_name || '새 메시지';
  const title = roomName;
  const bodyText = content.slice(0, 100) + (content.length > 100 ? '…' : '');

  try {
    getAdminApp();
    const messaging = admin.messaging();
    const message: admin.messaging.MulticastMessage = {
      tokens: fcmTokens,
      notification: { title, body: bodyText },
      data: { room_id: roomId, message_id: messageId || '', title, body: bodyText },
      android: { notification: { vibrateTimingMillis: [200, 100, 200] } },
      apns: { payload: { aps: { sound: 'default' } } },
    };
    const result = await messaging.sendEachForMulticast(message);
    return NextResponse.json({ ok: true, sent: result.successCount, failed: result.failureCount });
  } catch (e) {
    console.error('FCM send error:', e);
    return NextResponse.json({ error: 'FCM send failed' }, { status: 500 });
  }
}
