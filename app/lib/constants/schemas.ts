/**
 * PLAY v1 Draft 스키마
 * Zod 기반 검증, operator 3타입: BINARY, PROGRESSIVE, DROP
 */

import { z } from 'zod';

/** PROGRESSIVE style: wipe | frames */
export const PROGRESSIVE_STYLE = ['wipe', 'frames'] as const;
export type ProgressiveStyle = (typeof PROGRESSIVE_STYLE)[number];

/** Set operator 3타입 - discriminated union */
export const BinaryOperatorSchema = z.object({
  type: z.literal('BINARY'),
});

export const ProgressiveOperatorSchema = z.object({
  type: z.literal('PROGRESSIVE'),
  style: z.enum(PROGRESSIVE_STYLE),
});

export const DropOperatorSchema = z.object({
  type: z.literal('DROP'),
});

export const SetOperatorSchema = z.discriminatedUnion('type', [
  BinaryOperatorSchema,
  ProgressiveOperatorSchema,
  DropOperatorSchema,
]);

export type BinaryOperator = z.infer<typeof BinaryOperatorSchema>;
export type ProgressiveOperator = z.infer<typeof ProgressiveOperatorSchema>;
export type DropOperator = z.infer<typeof DropOperatorSchema>;
export type SetOperator = z.infer<typeof SetOperatorSchema>;

/** Set: set1, set2 각각 operator 가짐 */
export const PlaySetSchema = z.object({
  operator: SetOperatorSchema,
});

export type PlaySet = z.infer<typeof PlaySetSchema>;

/** Block: motionId + set1 + set2 */
export const PlayBlockSchema = z.object({
  motionId: z.string(),
  set1: PlaySetSchema,
  set2: PlaySetSchema,
});

export type PlayBlock = z.infer<typeof PlayBlockSchema>;

/** PlayDraft: blocks length=5 */
export const PlayDraftSchema = z.object({
  blocks: z.array(PlayBlockSchema).length(5),
});

export type PlayDraft = z.infer<typeof PlayDraftSchema>;
