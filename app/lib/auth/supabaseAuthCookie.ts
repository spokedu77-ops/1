export function isSupabaseAuthCookieName(name: string): boolean {
  return name.startsWith('sb-') && name.includes('auth-token');
}

export function clearBrowserSupabaseAuthCookies(): void {
  if (typeof document === 'undefined') return;
  const names = document.cookie
    .split(';')
    .map((part) => part.trim().split('=')[0] ?? '')
    .filter(isSupabaseAuthCookieName);
  const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; expires=${expires}; path=/; SameSite=Lax`;
  }
}
