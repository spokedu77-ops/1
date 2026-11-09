import { redirect } from 'next/navigation';

/** Legacy bookmarks retain their selected teacher and counting view. */
export default async function UsersRedirect({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({ workspace: 'teachers' });
  if (typeof params.teacher === 'string') query.set('teacher', params.teacher);
  if (params.tab === 'counting') query.set('teacherView', 'counting');
  redirect(`/admin/classes/calendar?${query}`);
}
