import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  assertToggleParent,
  isValidBlockType,
  isValidChildBlockType,
  nextBlockOrderIndex,
} from '@/app/lib/admin/memo/memoDb';
import type { MemoBlockRow } from '@/app/lib/admin/memo/types';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id: memoId } = await context.params;
    const supabase = getServiceSupabase();

    const { data: memo, error: memoError } = await supabase
      .from('admin_memos')
      .select('id, title, updated_by, updated_at')
      .eq('id', memoId)
      .maybeSingle();
    if (memoError) {
      return NextResponse.json({ ok: false, error: memoError.message }, { status: 500 });
    }
    if (!memo) {
      return NextResponse.json({ ok: false, error: '페이지를 찾을 수 없습니다.' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('admin_memo_blocks')
      .select(
        'id, memo_id, parent_block_id, type, content, checked, collapsed, order_index, created_by, updated_by, created_at, updated_at',
      )
      .eq('memo_id', memoId)
      .order('order_index', { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      page: memo,
      blocks: (data ?? []) as MemoBlockRow[],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id: memoId } = await context.params;
    const body = (await req.json().catch(() => null)) as {
      type?: unknown;
      parentBlockId?: unknown;
      content?: unknown;
    } | null;

    const type = typeof body?.type === 'string' ? body.type : '';
    if (!isValidBlockType(type)) {
      return NextResponse.json({ ok: false, error: '유효한 블록 타입이 필요합니다.' }, { status: 400 });
    }

    const parentBlockId =
      typeof body?.parentBlockId === 'string' && body.parentBlockId.trim()
        ? body.parentBlockId.trim()
        : null;

    const supabase = getServiceSupabase();

    const { data: memo, error: memoError } = await supabase
      .from('admin_memos')
      .select('id')
      .eq('id', memoId)
      .maybeSingle();
    if (memoError) {
      return NextResponse.json({ ok: false, error: memoError.message }, { status: 500 });
    }
    if (!memo) {
      return NextResponse.json({ ok: false, error: '페이지를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (parentBlockId) {
      if (type === 'toggle') {
        return NextResponse.json({ ok: false, error: '토글 안 토글은 지원하지 않습니다.' }, { status: 400 });
      }
      if (!isValidChildBlockType(type)) {
        return NextResponse.json({ ok: false, error: '유효하지 않은 자식 블록입니다.' }, { status: 400 });
      }
      const parentCheck = await assertToggleParent(supabase, memoId, parentBlockId);
      if (!parentCheck.ok) {
        return NextResponse.json({ ok: false, error: parentCheck.error }, { status: 400 });
      }
    } else if (!isValidBlockType(type)) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 블록입니다.' }, { status: 400 });
    }

    const orderIndex = await nextBlockOrderIndex(supabase, memoId, parentBlockId);
    const content = typeof body?.content === 'string' ? body.content : '';
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('admin_memo_blocks')
      .insert({
        memo_id: memoId,
        parent_block_id: parentBlockId,
        type,
        content,
        order_index: orderIndex,
        created_by: auth.userId,
        updated_by: auth.userId,
        updated_at: now,
      })
      .select(
        'id, memo_id, parent_block_id, type, content, checked, collapsed, order_index, created_by, updated_by, created_at, updated_at',
      )
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    await supabase
      .from('admin_memos')
      .update({ updated_by: auth.userId, updated_at: now })
      .eq('id', memoId);

    return NextResponse.json({ ok: true, block: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
