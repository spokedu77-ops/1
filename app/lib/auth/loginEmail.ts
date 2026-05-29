const LOGIN_EMAIL_ALIASES: Record<string, string> = {
  admin: 'choijihoon@spokedu.com',
  jihoon: 'choijihoon@spokedu.com',
  jihun: 'choijihoon@spokedu.com',
  choijihoon: 'choijihoon@spokedu.com',
  gumin: 'kimkoomin@spokedu.com',
  koomin: 'kimkoomin@spokedu.com',
  kimkoomin: 'kimkoomin@spokedu.com',
  yunki: 'kimyoonki@spokedu.com',
  yoonki: 'kimyoonki@spokedu.com',
  kimyoonki: 'kimyoonki@spokedu.com',
};

export function resolveLoginEmail(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes('@')) return trimmed.toLowerCase();

  const alias = LOGIN_EMAIL_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  return `${trimmed.toLowerCase()}@spokedu.com`;
}
