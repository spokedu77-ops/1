import { describe, expect, it } from 'vitest';
import {
  decisionForDisplayDirection,
  defaultPrimarySkillForSession,
  recommendSelection,
  toDisplayDirection,
} from './learningLoop';

describe('special PE learning loop', () => {
  it('maps standard pathway sessions to pair skills', () => {
    expect(defaultPrimarySkillForSession(1)).toBe('공간·이동');
    expect(defaultPrimarySkillForSession(2)).toBe('공간·이동');
    expect(defaultPrimarySkillForSession(21)).toBe('협동·사회적 움직임');
    expect(defaultPrimarySkillForSession(23)).toBeNull();
  });

  it('keeps unstable performance at stabilize', () => {
    expect(
      recommendSelection({
        attendance_status: 'present',
        observation_opportunity_band: 'three_plus',
        primary_skill: '점프·착지',
        skill_level: 2,
        task_state: 'forming',
        process_state: 'forming',
        support_level: 1,
      }),
    ).toBe('stabilize');
  });

  it('prioritizes fading support before raising difficulty', () => {
    expect(
      recommendSelection({
        attendance_status: 'present',
        observation_opportunity_band: 'three_plus',
        primary_skill: '점프·착지',
        skill_level: 2,
        task_state: 'stable',
        process_state: 'stable',
        support_level: 2,
      }),
    ).toBe('fade_support');
  });

  it('uses generalization as the conservative stable-session recommendation', () => {
    expect(
      recommendSelection({
        attendance_status: 'present',
        observation_opportunity_band: 'three_plus',
        primary_skill: '점프·착지',
        skill_level: 2,
        task_state: 'stable',
        process_state: 'stable',
        support_level: 0,
      }),
    ).toBe('generalize');
  });

  it('collapses internal decisions into four field-facing directions', () => {
    expect(toDisplayDirection('access_reset')).toBe('adjust');
    expect(toDisplayDirection('stabilize')).toBe('adjust');
    expect(toDisplayDirection('fade_support')).toBe('adjust');
    expect(toDisplayDirection('generalize')).toBe('generalize');
    expect(toDisplayDirection('advance')).toBe('advance');
    expect(toDisplayDirection('transfer')).toBe('transfer');
  });

  it('preserves the internal adjust reason when the teacher accepts adjust', () => {
    expect(decisionForDisplayDirection('adjust', 'fade_support')).toBe('fade_support');
    expect(decisionForDisplayDirection('adjust', null)).toBe('stabilize');
  });
});
