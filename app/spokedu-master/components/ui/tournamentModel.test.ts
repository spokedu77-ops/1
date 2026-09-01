import { describe, expect, it } from 'vitest';
import { createTournamentBracket, getTournamentRoundLabel, selectTournamentWinner } from './tournamentModel';

const players = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `p${index + 1}`, name: `참가자 ${index + 1}` }));

describe('single elimination tournament contract', () => {
  it('builds power-of-two rounds and advances byes without inventing participants', () => {
    const bracket = createTournamentBracket(players(5));
    expect(bracket.rounds.map((round) => round.length)).toEqual([4, 2, 1]);
    expect(bracket.rounds[0]![2]!.winnerId).toBe('p5');
    expect(bracket.rounds[1]![1]!.winnerId).toBe('p5');
  });

  it('propagates a selected winner and clears invalid downstream results when changed', () => {
    let bracket = createTournamentBracket(players(4));
    bracket = selectTournamentWinner(bracket, 0, 0, 'p1');
    bracket = selectTournamentWinner(bracket, 0, 1, 'p3');
    bracket = selectTournamentWinner(bracket, 1, 0, 'p1');
    expect(bracket.rounds[1]![0]!.winnerId).toBe('p1');
    bracket = selectTournamentWinner(bracket, 0, 0, 'p2');
    expect(bracket.rounds[1]![0]!.participantIds).toEqual(['p2', 'p3']);
    expect(bracket.rounds[1]![0]!.winnerId).toBeNull();
  });

  it('preserves results in an unaffected branch when an earlier winner changes', () => {
    let bracket = createTournamentBracket(players(8));
    bracket = selectTournamentWinner(bracket, 0, 0, 'p1');
    bracket = selectTournamentWinner(bracket, 0, 1, 'p3');
    bracket = selectTournamentWinner(bracket, 0, 2, 'p5');
    bracket = selectTournamentWinner(bracket, 0, 3, 'p7');
    bracket = selectTournamentWinner(bracket, 1, 0, 'p1');
    bracket = selectTournamentWinner(bracket, 1, 1, 'p5');
    bracket = selectTournamentWinner(bracket, 0, 0, 'p2');
    expect(bracket.rounds[1]![0]!.winnerId).toBeNull();
    expect(bracket.rounds[1]![1]!.winnerId).toBe('p5');
  });

  it('uses semantic labels for later rounds', () => {
    expect([0, 1, 2].map((index) => getTournamentRoundLabel(index, 3))).toEqual(['1라운드', '준결승', '결승']);
  });
});
