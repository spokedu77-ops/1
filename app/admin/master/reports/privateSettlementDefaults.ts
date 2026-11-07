export const PRIVATE_SETTLEMENT_OPTIONS = [
  { ratio: 1, label: '1:1 개인', fee: 60000, sessions: 8 },
  { ratio: 2, label: '2:1 그룹', fee: 80000, sessions: 6 },
  { ratio: 3, label: '3:1 그룹', fee: 105000, sessions: 6 },
  { ratio: 4, label: '4:1 그룹', fee: 120000, sessions: 6 },
] as const;

export function privateSettlementDefault(classType: string) {
  const value = classType.replace(/\s/g, '');
  const ratio = /(?:1:1|개인)/.test(value) ? 1
    : /(?:1:2|2:1|듀엣)/.test(value) ? 2
      : /(?:1:3|3:1)/.test(value) ? 3
        : /(?:1:4|4:1)/.test(value) ? 4 : null;
  return PRIVATE_SETTLEMENT_OPTIONS.find((option) => option.ratio === ratio) ?? null;
}
