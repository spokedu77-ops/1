export const CENTER_STATUS_OPTIONS = [
  { value: 'ongoing', label: '상시' },
  { value: 'regular', label: '정규' },
  { value: 'short', label: '단기' },
  { value: 'ended', label: '종료' },
] as const;

export type CenterStatus = typeof CENTER_STATUS_OPTIONS[number]['value'];

export const CENTER_STATUS_STYLES: Record<CenterStatus, string> = {
  ongoing: 'bg-emerald-100 text-emerald-800',
  regular: 'bg-indigo-100 text-indigo-800',
  short: 'bg-amber-100 text-amber-800',
  ended: 'bg-slate-100 text-slate-600',
};

export const CENTER_STATUS_LABELS: Record<CenterStatus, string> = {
  ongoing: '상시', regular: '정규', short: '단기', ended: '종료',
};
