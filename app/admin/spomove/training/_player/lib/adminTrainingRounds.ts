/** Administrator settings only. Public and teacher run contracts remain unchanged. */
export const ADMIN_TRAINING_ROUNDS = [5, 10, 15, 20] as const;
export function normalizeAdminTrainingRounds(value?: number): number {
  return (ADMIN_TRAINING_ROUNDS as readonly number[]).includes(value ?? 0) ? value! : 20;
}
