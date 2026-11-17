import { requireAdmin } from '@/app/lib/server/adminAuth';
import { listWorkEvents } from '@/app/lib/server/aiWorkLog';
import { buildProjectContext } from '@/app/lib/admin/updateLog/contract';
import { adminJson } from '@/app/lib/server/blogDraftsAdmin';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const project = url.searchParams.get('project')?.trim() ?? '';
  const instruction = url.searchParams.get('instruction')?.trim() ?? '';
  if (!project || project.length > 80) return adminJson({ error: '프로젝트명이 필요합니다.' }, 400);
  const listed = await listWorkEvents({ project });
  if (!listed.ok) return adminJson({ error: listed.error }, 503);
  return adminJson({
    project,
    ...buildProjectContext(listed.events.filter(event => event.project === project), instruction),
    integration: {
      chatgptAutoRead: false,
      requiresAdminSession: true,
      endpoint: '/api/admin/update-log/context',
    },
  });
}
