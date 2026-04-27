/**
 * 센터 관리 핵심 Zod 스키마 (압축 리뉴얼)
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

const criminalCheckFileSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
});

export const centerStatusSchema = z.enum(['active', 'paused', 'ended']);

export const createCenterSchema = z.object({
  name: z.string().min(1, '센터명 필수'),
  region_tag: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  access_note: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  contact_email: z.string().optional().nullable(),
  contact_role: z.string().optional().nullable(),
  status: centerStatusSchema.optional().default('active'),
  contract_start: z.string().optional().nullable(),
  contract_end: z.string().optional().nullable(),
  session_fee: z.number().int().min(0).optional().nullable(),
  main_teacher_id: z.string().uuid().optional().nullable(),
  main_teacher_2_id: z.string().uuid().optional().nullable(),
  main_teacher_3_id: z.string().uuid().optional().nullable(),
  weekly_schedule: z.array(weeklySlotSchema).optional().default([]),
  instructors_default: instructorsDefaultSchema.optional().default({ main: null, sub: null, backup: [] }),
  highlights: z.string().optional().nullable(),
  criminal_check_facility_id: z.string().optional().nullable(),
  criminal_check_facility_password: z.string().optional().nullable(),
  criminal_check_files: z.array(criminalCheckFileSchema).optional().default([]),
});

export const updateCenterSchema = createCenterSchema.partial();

export type CreateCenterInput = z.infer<typeof createCenterSchema>;
export type UpdateCenterInput = z.infer<typeof updateCenterSchema>;
