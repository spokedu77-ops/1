import { z } from 'zod';
import type { CenterTeacherFee } from './types';

const amount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const centerBillingBreakdownSchema = z.object({
  mainCharge: amount,
  assistCharge: amount,
  rentalCharge: amount,
}).refine((value) => Number.isSafeInteger(value.mainCharge + value.assistCharge + value.rentalCharge), '회당 수업료 합계가 너무 큽니다.');
export type CenterBillingBreakdown = z.infer<typeof centerBillingBreakdownSchema>;

export function totalCenterFee(value: CenterBillingBreakdown): number {
  return value.mainCharge + value.assistCharge + value.rentalCharge;
}

/** Payouts are independent of what the center is charged. */
export function resolveCenterLabor({ mainId, assistantIds, fees }: {
  mainId?: string | null; assistantIds: (string | null | undefined)[];
  fees: CenterTeacherFee[];
}): { mainFee: number; assistFee: number } | null {
  const assistants = assistantIds.filter((id): id is string => Boolean(id));
  const assigned = [mainId, ...assistants].filter(Boolean);
  if (new Set(assigned).size !== assigned.length) return null;
  const mainFee = mainId ? fees.find((fee) => fee.teacher_id === mainId && fee.role === 'main')?.amount : 0;
  const assistantFees = assistants.map((id) => fees.find((fee) => fee.teacher_id === id && fee.role === 'assist')?.amount);
  if (mainFee == null || assistantFees.some((fee) => fee == null)) return null;
  const assistFee = assistantFees.reduce<number>((sum, fee) => sum + (fee ?? 0), 0);
  return [mainFee, assistFee, mainFee + assistFee].every((fee) => Number.isSafeInteger(fee) && fee >= 0) ? { mainFee, assistFee } : null;
}
