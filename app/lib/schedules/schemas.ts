/**
 * 일정(schedules) Zod 스키마
 */

import { z } from 'zod';

export const scheduleStatusSchema = z.enum(['active', 'done']);

export const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
});

export const createScheduleSchema = z.object({
  title: z.string().min(1, '제목 필수'),
  assignee: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  sessions_count: z.number().int().optional().nullable(),
  note: z.string().optional().nullable(),
  checklist: z.array(checklistItemSchema).optional().default([]),
  status: scheduleStatusSchema.optional().default('active'),
});

export const updateScheduleSchema = createScheduleSchema.partial();

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
