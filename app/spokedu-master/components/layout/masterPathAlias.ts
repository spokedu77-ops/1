export function normalizeMasterAppPath(pathname: string) {
  if (pathname === '/spokedu-master') return '/spokedu-lab';
  if (pathname.startsWith('/spokedu-master/')) return pathname.replace('/spokedu-master', '/spokedu-lab');
  return pathname;
}
