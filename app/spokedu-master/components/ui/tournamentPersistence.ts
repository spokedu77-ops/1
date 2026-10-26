import type { TournamentBracket, TournamentParticipant } from './tournamentModel';

const STORAGE_PREFIX = 'spokedu-lab:class-tool:tournament:v1:';

export type StoredTournamentState = {
  schemaVersion: 1;
  rosterKey: string;
  participants: TournamentParticipant[];
  bracket: TournamentBracket;
  nextCustomId: number;
};

export function tournamentStorageScopeKey(classKey: string, sessionId: string) {
  const classPart = classKey.trim() || '_no_class';
  const sessionPart = sessionId.trim() || '_no_session';
  return `${classPart}::${sessionPart}`;
}

export function buildTournamentRosterKey(participants: readonly TournamentParticipant[]) {
  return participants.map((participant) => `${participant.id}:${participant.name}`).join('|');
}

export function participantsFromRosterKey(rosterKey: string): TournamentParticipant[] {
  if (!rosterKey) return [];
  return rosterKey
    .split('|')
    .map((entry) => {
      const colon = entry.indexOf(':');
      if (colon <= 0) return null;
      return { id: entry.slice(0, colon), name: entry.slice(colon + 1) };
    })
    .filter((row): row is TournamentParticipant => row != null);
}

function isParticipant(value: unknown): value is TournamentParticipant {
  if (!value || typeof value !== 'object') return false;
  const row = value as TournamentParticipant;
  return typeof row.id === 'string' && row.id.length > 0 && typeof row.name === 'string';
}

function isBracket(value: unknown): value is TournamentBracket {
  if (!value || typeof value !== 'object') return false;
  const bracket = value as TournamentBracket;
  if (!bracket.participants || typeof bracket.participants !== 'object') return false;
  if (!Array.isArray(bracket.rounds)) return false;
  for (const round of bracket.rounds) {
    if (!Array.isArray(round)) return false;
    for (const match of round) {
      if (!match || typeof match !== 'object') return false;
      if (typeof match.id !== 'string') return false;
      if (typeof match.active !== 'boolean') return false;
      if (!Array.isArray(match.participantIds) || match.participantIds.length !== 2) return false;
      if (match.winnerId != null && typeof match.winnerId !== 'string') return false;
    }
  }
  return true;
}

export function parseStoredTournamentState(raw: unknown): StoredTournamentState | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as StoredTournamentState;
  if (value.schemaVersion !== 1) return null;
  if (typeof value.rosterKey !== 'string') return null;
  if (!Array.isArray(value.participants) || !value.participants.every(isParticipant)) return null;
  if (!isBracket(value.bracket)) return null;
  if (!Number.isInteger(value.nextCustomId) || value.nextCustomId < 1) return null;
  return value;
}

export function readStoredTournamentState(scopeKey: string): StoredTournamentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${scopeKey}`);
    if (!raw) return null;
    return parseStoredTournamentState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeStoredTournamentState(scopeKey: string, state: StoredTournamentState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${scopeKey}`, JSON.stringify(state));
  } catch {
    /* Quota or privacy mode — tournament still works in-memory for this visit. */
  }
}

export function clearStoredTournamentState(scopeKey: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${scopeKey}`);
  } catch {
    /* ignore */
  }
}

export function tournamentStateMatchesRoster(state: StoredTournamentState, rosterKey: string) {
  return state.rosterKey === rosterKey;
}
