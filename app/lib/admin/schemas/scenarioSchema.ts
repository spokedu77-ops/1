import { z } from 'zod';

/**
 * Action Config 스키마
 */
export const ActionConfigSchema = z.object({
  id: z.string(),
  type: z.string(),
  startTime: z.number().min(0),
  duration: z.number().min(0),
  position: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  }),
  intensity: z.enum(['LOW', 'MID', 'HIGH']),
  images: z.object({
    off: z.string(),
    on: z.string(),
  }).optional(),
  introText: z.object({
    en: z.string(),
    ko: z.string(),
  }).optional(),
});

/**
 * Scenario JSON 스키마
 */
export const ScenarioJSONSchema = z.object({
  theme: z.string(),
  duration: z.number().min(0).max(600), // 최대 10분
  actions: z.array(ActionConfigSchema).min(1).max(100),
});

/**
 * Program Phase 스키마
 */
export const PlayPhaseSchema = z.object({
  type: z.literal('play'),
  scenario_id: z.string(),
  duration: z.number().min(0),
});

export const ThinkPhaseSchema = z.object({
  type: z.literal('think'),
  content_type: z.string(),
  duration: z.number().min(0),
});

export const FlowPhaseSchema = z.object({
  type: z.literal('flow'),
  content_type: z.string(),
  duration: z.number().min(0),
});

export const ProgramPhaseSchema = z.union([
  PlayPhaseSchema,
  ThinkPhaseSchema,
  FlowPhaseSchema,
]);

/**
 * Program Phases 배열 스키마
 */
export const ProgramPhasesSchema = z.array(ProgramPhaseSchema).min(1).max(10);

/**
 * 전체 프로그램 스키마
 */
export const WarmupProgramSchema = z.object({
  id: z.string(),
  week_id: z.string().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  total_duration: z.number().min(0),
  phases: ProgramPhasesSchema,
  is_active: z.boolean().optional(),
});
