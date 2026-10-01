export type NextSessionCopyIntent =
  | { kind: 'none'; copyPrograms: false }
  | { kind: 'selective'; sourceSessionProgramIds: string[] };

export function resolveNextSessionCopyIntent(body: { copyPrograms?: unknown; sourceSessionProgramIds?: unknown } | null): NextSessionCopyIntent | null {
  if (!body) return null;
  const hasCopyPrograms = body.copyPrograms !== undefined;
  const hasSourceIds = body.sourceSessionProgramIds !== undefined;
  if (hasCopyPrograms === hasSourceIds) return null;
  if (hasCopyPrograms) return body.copyPrograms === false ? { kind: 'none', copyPrograms: false } : null;
  const ids = body.sourceSessionProgramIds;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string') || new Set(ids).size !== ids.length) return null;
  return { kind: 'selective', sourceSessionProgramIds: ids };
}
