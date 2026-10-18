export const CRIMINAL_CHECK_PRIVATE_BUCKET = 'spokedu-center-criminal-checks';
export const CRIMINAL_CHECK_LEGACY_BUCKET = 'iiwarmup-files';
export const CRIMINAL_CHECK_MAX_FILE_BYTES = 25 * 1024 * 1024;

export function sanitizeCriminalCheckFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot + 1) : '';
  const safeBase = base
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '') || 'file';
  const safeExtension = extension.replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
  return safeExtension ? `${safeBase}.${safeExtension}` : safeBase;
}

export function centerCriminalCheckPathPrefix(centerId: string): string {
  return `centers/${centerId}/criminal-check/`;
}

export function isCenterCriminalCheckPath(centerId: string, path: string): boolean {
  return path.startsWith(centerCriminalCheckPathPrefix(centerId))
    && !path.includes('..')
    && !path.startsWith('/');
}
