/**
 * Contact E2E DB safety — approved ref must be set independently in env
 * (never auto-copied from NEXT_PUBLIC_SUPABASE_URL at runtime).
 */

export function parseProjectRefFromUrl(supabaseUrl) {
  try {
    const host = new URL(supabaseUrl).hostname;
    const ref = host.split('.')[0];
    return ref || null;
  } catch {
    return null;
  }
}

/**
 * @returns {{ allowDbWrites: boolean, approvedProjectRefConfigured: boolean, approvedProjectRefMatch: boolean, blockedHit: boolean, hostRedacted: string | null }}
 * @throws Error with DB_ENVIRONMENT_BLOCKED prefix
 */
export function assertContactE2eDbSafety() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const allow = process.env.CONTACT_E2E_ALLOW_DB_WRITES?.trim() === '1';
  const approved = process.env.CONTACT_E2E_APPROVED_PROJECT_REF?.trim().toLowerCase();
  const blockedRaw = process.env.CONTACT_E2E_BLOCKED_PROJECT_REFS?.trim() ?? '';
  const blocked = new Set(
    blockedRaw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

  const actualRef = url ? parseProjectRefFromUrl(url)?.toLowerCase() : null;

  const summary = {
    allowDbWrites: allow,
    approvedProjectRefConfigured: Boolean(approved),
    approvedProjectRefMatch: Boolean(approved && actualRef && approved === actualRef),
    blockedHit: Boolean(actualRef && blocked.has(actualRef)),
    hostRedacted: url ? '[REDACTED].supabase.co' : null,
    productionRefsBlocked: [...blocked],
  };

  if (!url) throw new Error('DB_ENVIRONMENT_BLOCKED: NEXT_PUBLIC_SUPABASE_URL missing');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error('DB_ENVIRONMENT_BLOCKED: SUPABASE_SERVICE_ROLE_KEY missing');
  }
  if (!allow) throw new Error('DB_ENVIRONMENT_BLOCKED: CONTACT_E2E_ALLOW_DB_WRITES=1 required');
  if (!approved) {
    throw new Error(
      'DB_ENVIRONMENT_BLOCKED: CONTACT_E2E_APPROVED_PROJECT_REF must be set independently in env (not derived from URL at runtime)',
    );
  }
  if (!actualRef) throw new Error('DB_ENVIRONMENT_BLOCKED: could not parse project ref from URL');
  if (approved !== actualRef) {
    throw new Error('DB_ENVIRONMENT_BLOCKED: approved project ref does not match connected URL');
  }
  if (blocked.has(actualRef)) {
    throw new Error('DB_ENVIRONMENT_BLOCKED: connected project ref is in CONTACT_E2E_BLOCKED_PROJECT_REFS');
  }

  return summary;
}
