import { z } from 'zod';
import { centerBillingBreakdownSchema } from './feeBreakdown';

export const centerSettlementDefaultsSchema = z.object({
  projectName: z.string().trim().max(160).optional(),
  type: z.enum(['regular', 'short', 'etc']).default('regular'),
  sessions: z.number().int().min(1).max(1000).nullable().default(null),
  vat: z.enum(['auto', 'none']).default('auto'),
  whRate: z.number().min(0).max(100).default(0),
  termType: z.enum(['end', 'day', 'days']).default('end'),
  termValue: z.number().int().min(0).max(365).default(0),
  billingBreakdown: centerBillingBreakdownSchema.optional(),
}).superRefine((value, context) => {
  if (value.termType === 'day' && (value.termValue < 1 || value.termValue > 31)) context.addIssue({ code: 'custom', path: ['termValue'], message: '결제일은 1~31일로 입력해 주세요.' });
  if (value.termType === 'days' && value.termValue < 1) context.addIssue({ code: 'custom', path: ['termValue'], message: '결제 기한을 입력해 주세요.' });
});

export type CenterSettlementDefaults = z.infer<typeof centerSettlementDefaultsSchema>;
export const DEFAULT_CENTER_SETTLEMENT: CenterSettlementDefaults = centerSettlementDefaultsSchema.parse({});

export function readCenterSettlementDefaults(value: unknown): CenterSettlementDefaults {
  const parsed = centerSettlementDefaultsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : { ...DEFAULT_CENTER_SETTLEMENT };
}
