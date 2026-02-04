/**
 * 센터 정보 MVP Zod 스키마
 */

import { z } from 'zod';

const weeklySlotSchema = z.object({
  day: z.string(),
  start: z.string(),
  end: z.string(),
  place: z.string(),
  note: z.string(),
});

const instructorsDefaultSchema = z.object({
  main: z.string().nullable(),
  sub: z.string().nullable(),
  backup: z.array(z.string()),
});

const nextActionItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
});

const programInstructorsSchema = z.object({
  main: z.string().nullable().optional(),
  sub: z.string().nullable().optional(),
});

export const centerStatusSchema = z.enum(['active', 'paused', 'ended']);
export const programStatusSchema = z.enum(['active', 'done']);
export const centerLogTypeSchema = z.enum(['request', 'issue', 'result', 'note']);

export const createCenterSchema = z.object({
  name: z.string().min(1, '센터명 필수'),
  region_tag: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  access_note: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  contact_role: z.string().optional().nullable(),
  status: centerStatusSchema.optional().default('active'),
  contract_start: z.string().optional().nullable(),
  contract_end: z.string().optional().nullable(),
  weekly_schedule: z.array(weeklySlotSchema).optional().default([]),
  instructors_default: instructorsDefaultSchema.optional().default({ main: null, sub: null, backup: [] }),
  highlights: z.string().optional().nullable(),
  next_actions: z.array(nextActionItemSchema).optional().default([]),
});

export const updateCenterSchema = createCenterSchema.partial();

export const updateCenterOperationsSchema = z.object({
  access_note: z.string().optional().nullable(),
  highlights: z.string().optional().nullable(),
  weekly_schedule: z.array(weeklySlotSchema).optional(),
  instructors_default: instructorsDefaultSchema.optional(),
});

export const nextActionsUpdateSchema = z.object({
  next_actions: z.array(nextActionItemSchema),
});

export const centerFinanceTermsSchema = z.object({
  unit_price: z.number().int().optional().nullable(),
  payment_day: z.string().optional().nullable(),
  invoice_required: z.boolean().optional().default(false),
  doc_checklist: z.array(z.string()).optional().default([]),
  special_terms: z.string().optional().nullable(),
});

export const createProgramSchema = z.object({
  center_id: z.string().uuid(),
  name: z.string().min(1, '프로그램명 필수'),
  term: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  sessions_count: z.number().int().optional().nullable(),
  instructors: programInstructorsSchema.optional().default({}),
  note: z.string().optional().nullable(),
  status: programStatusSchema.optional().default('active'),
});

export const updateProgramSchema = createProgramSchema.omit({ center_id: true }).partial();

export const createCenterLogSchema = z.object({
  center_id: z.string().uuid(),
  log_date: z.string().optional(),
  type: centerLogTypeSchema.optional().default('note'),
  content: z.string().min(1, '내용 필수'),
  next_action: z.string().optional().nullable(),
});

export const updateCenterLogSchema = createCenterLogSchema.omit({ center_id: true }).partial();

export const createCenterFileSchema = z.object({
  center_id: z.string().uuid(),
  title: z.string().min(1, '제목 필수'),
  url: z.string().url('유효한 URL'),
  category: z.string().optional().nullable(),
});

export const updateCenterFileSchema = createCenterFileSchema.omit({ center_id: true }).partial();

export type CreateCenterInput = z.infer<typeof createCenterSchema>;
export type UpdateCenterInput = z.infer<typeof updateCenterSchema>;
export type UpdateCenterOperationsInput = z.infer<typeof updateCenterOperationsSchema>;
export type NextActionsUpdateInput = z.infer<typeof nextActionsUpdateSchema>;
export type CenterFinanceTermsInput = z.infer<typeof centerFinanceTermsSchema>;
export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type CreateCenterLogInput = z.infer<typeof createCenterLogSchema>;
export type UpdateCenterLogInput = z.infer<typeof updateCenterLogSchema>;
export type CreateCenterFileInput = z.infer<typeof createCenterFileSchema>;
export type UpdateCenterFileInput = z.infer<typeof updateCenterFileSchema>;
