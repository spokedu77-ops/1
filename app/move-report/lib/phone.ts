export function normalizeMoveReportPhone(raw: unknown): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (/^010\d{8}$/.test(digits)) return digits;
  if (digits.startsWith('8210') && digits.length === 12) {
    const local = `010${digits.slice(4)}`;
    return /^010\d{8}$/.test(local) ? local : null;
  }
  return null;
}

export function isValidMoveReportPhone(raw: unknown): boolean {
  return normalizeMoveReportPhone(raw) !== null;
}
