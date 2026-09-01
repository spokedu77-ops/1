export type TournamentParticipant = { id: string; name: string };

export type TournamentMatch = {
  id: string;
  active: boolean;
  participantIds: [string | null, string | null];
  winnerId: string | null;
};

export type TournamentBracket = {
  participants: Record<string, TournamentParticipant>;
  rounds: TournamentMatch[][];
};

function nextPowerOfTwo(value: number) {
  let size = 1;
  while (size < value) size *= 2;
  return size;
}

function roundLabel(roundIndex: number, roundCount: number) {
  if (roundIndex === roundCount - 1) return '결승';
  if (roundIndex === roundCount - 2) return '준결승';
  return `${roundIndex + 1}라운드`;
}

export function getTournamentRoundLabel(roundIndex: number, roundCount: number) {
  return roundLabel(roundIndex, roundCount);
}

function rebuildFrom(bracket: TournamentBracket, fromRound: number): TournamentBracket {
  const rounds = bracket.rounds.map((round) => round.map((match) => ({ ...match, participantIds: [...match.participantIds] as [string | null, string | null] })));
  for (let roundIndex = Math.max(1, fromRound); roundIndex < rounds.length; roundIndex += 1) {
    const previous = rounds[roundIndex - 1]!;
    rounds[roundIndex] = rounds[roundIndex]!.map((match, matchIndex) => {
      const leftSource = previous[matchIndex * 2]!;
      const rightSource = previous[matchIndex * 2 + 1]!;
      const participantIds: [string | null, string | null] = [leftSource.winnerId, rightSource.winnerId];
      const active = leftSource.active || rightSource.active;
      const priorWinnerStillValid = match.winnerId != null && participantIds.includes(match.winnerId);
      let winnerId = priorWinnerStillValid ? match.winnerId : null;
      if (leftSource.active !== rightSource.active) {
        const activeSource = leftSource.active ? leftSource : rightSource;
        winnerId = activeSource.winnerId;
      }
      return { ...match, active, participantIds, winnerId };
    });
  }
  return { ...bracket, rounds };
}

export function createTournamentBracket(participants: readonly TournamentParticipant[]): TournamentBracket {
  if (participants.length < 2) return { participants: Object.fromEntries(participants.map((item) => [item.id, item])), rounds: [] };
  const size = nextPowerOfTwo(participants.length);
  const slots: Array<string | null> = [...participants.map((item) => item.id), ...Array.from({ length: size - participants.length }, () => null)];
  const roundCount = Math.log2(size);
  const rounds: TournamentMatch[][] = [];
  rounds.push(Array.from({ length: size / 2 }, (_, index) => {
    const participantIds: [string | null, string | null] = [slots[index * 2]!, slots[index * 2 + 1]!];
    const active = participantIds.some(Boolean);
    const winnerId = participantIds.filter(Boolean).length === 1 ? participantIds.find(Boolean)! : null;
    return { id: `r0-m${index}`, active, participantIds, winnerId };
  }));
  for (let roundIndex = 1; roundIndex < roundCount; roundIndex += 1) {
    rounds.push(Array.from({ length: size / (2 ** (roundIndex + 1)) }, (_, index) => ({
      id: `r${roundIndex}-m${index}`,
      active: false,
      participantIds: [null, null],
      winnerId: null,
    })));
  }
  return rebuildFrom({ participants: Object.fromEntries(participants.map((item) => [item.id, item])), rounds }, 1);
}

export function selectTournamentWinner(bracket: TournamentBracket, roundIndex: number, matchIndex: number, participantId: string): TournamentBracket {
  const match = bracket.rounds[roundIndex]?.[matchIndex];
  if (!match?.active || !match.participantIds.includes(participantId)) return bracket;
  const rounds = bracket.rounds.map((round) => round.map((item) => ({ ...item, participantIds: [...item.participantIds] as [string | null, string | null] })));
  rounds[roundIndex]![matchIndex] = { ...rounds[roundIndex]![matchIndex]!, winnerId: participantId };
  let downstreamMatchIndex = matchIndex;
  for (let index = roundIndex + 1; index < rounds.length; index += 1) {
    downstreamMatchIndex = Math.floor(downstreamMatchIndex / 2);
    rounds[index]![downstreamMatchIndex] = { ...rounds[index]![downstreamMatchIndex]!, winnerId: null };
  }
  return rebuildFrom({ ...bracket, rounds }, roundIndex + 1);
}
