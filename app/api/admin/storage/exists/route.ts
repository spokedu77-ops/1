/**
 * Storage 파일 존재 여부 배치 조회
 * POST body: { paths: string[] }
 * response: { exists: Record<string, boolean> }
 * 서버에서 폴더별로 list 호출해 path 존재 여부를 한 번에 반환 (클라이언트 요청 1회)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/app/lib/supabase/client';
import { BUCKET_NAME } from '@/app/lib/admin/constants/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const paths = Array.isArray(body.paths) ? (body.paths as string[]) : [];
    if (paths.length === 0) {
      return NextResponse.json({ exists: {} });
    }

    const uniquePaths = [...new Set(paths)].filter((p) => typeof p === 'string' && p.trim());
    const supabase = getSupabaseClient();

    // 폴더별로 그룹: folder -> [path]
    const byFolder = new Map<string, string[]>();
    for (const path of uniquePaths) {
        const parts = path.split('/');
        const fileName = parts.pop() || '';
        const folder = parts.join('/');
        if (!folder) continue;
        if (!byFolder.has(folder)) byFolder.set(folder, []);
        byFolder.get(folder)!.push(path);
    }

    const exists: Record<string, boolean> = {};
    for (const path of uniquePaths) {
      exists[path] = false;
    }

    for (const [folder, folderPaths] of byFolder) {
      try {
        const { data: files, error } = await supabase.storage
          .from(BUCKET_NAME)
          .list(folder, { limit: 500 });

        if (error) {
          console.warn('[storage/exists] list error:', folder, error.message);
          continue;
        }

        const fileNames = new Set((files || []).map((f) => f.name));
        for (const path of folderPaths) {
          const fileName = path.split('/').pop() || '';
          exists[path] = fileNames.has(fileName);
        }
      } catch (err) {
        console.warn('[storage/exists] folder list failed:', folder, err);
      }
    }

    return NextResponse.json({ exists });
  } catch (err) {
    console.error('[storage/exists] error:', err);
    return NextResponse.json(
      { error: 'Storage 검증 실패', exists: {} },
      { status: 500 }
    );
  }
}
