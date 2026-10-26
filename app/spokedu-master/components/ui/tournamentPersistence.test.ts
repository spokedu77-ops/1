import { describe, expect, it } from 'vitest';
import { createTournamentBracket } from './tournamentModel';
import {
  buildTournamentRosterKey,
  parseStoredTournamentState,
  tournamentStateMatchesRoster,
  tournamentStorageScopeKey,
} from './tournamentPersistence';

describe('tournamentPersistence', () => {
  it('scopes storage keys by class and session', () => {
    expect(tournamentStorageScopeKey('class-a', 'session-1')).not.toBe(tournamentStorageScopeKey('class-b', 'session-1'));
    expect(tournamentStorageScopeKey('class-a', '')).not.toBe(tournamentStorageScopeKey('class-a', 'session-1'));
  });

  it('accepts valid stored bracket state and rejects roster mismatch', () => {
    const participants = [
      { id: 'p1', name: '민준' },
      { id: 'p2', name: '서연' },
      { id: 'p3', name: '도윤' },
      { id: 'p4', name: '하은' },
    ];
    const rosterKey = buildTournamentRosterKey(participants);
    let bracket = createTournamentBracket(participants);
    bracket = {
      ...bracket,
      rounds: bracket.rounds.map((round, roundIndex) => round.map((match, matchIndex) => (
        roundIndex === 0 && matchIndex === 0 ? { ...match, winnerId: 'p1' } : match
      ))),
    };
    const stored = parseStoredTournamentState({
      schemaVersion: 1,
      rosterKey,
      participants,
      bracket,
      nextCustomId: 2,
    });
    expect(stored).not.toBeNull();
    expect(tournamentStateMatchesRoster(stored!, rosterKey)).toBe(true);
    expect(tournamentStateMatchesRoster(stored!, `${rosterKey}-changed`)).toBe(false);
  });

  it('rejects malformed persisted payloads', () => {
    expect(parseStoredTournamentState(null)).toBeNull();
    expect(parseStoredTournamentState({ schemaVersion: 2 })).toBeNull();
    expect(parseStoredTournamentState({ schemaVersion: 1, rosterKey: 'x', participants: [], bracket: {}, nextCustomId: 1 })).toBeNull();
  });
});
