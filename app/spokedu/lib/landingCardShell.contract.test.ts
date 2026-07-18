import { describe, expect, it } from 'vitest';
import { landingCardShell } from '../components/visual/card-variants';
import * as uiClasses from './ui-classes';

/**
 * CI 회귀: ui-classes의 정적 프레임 문자열을 landingCardShell로 다시 노출하면
 * `landingCardShell('image')` 호출이 tsc에서 "This expression is not callable"로 터진다.
 */
describe('landingCardShell naming contract', () => {
  it('exports a callable variant helper from card-variants', () => {
    expect(typeof landingCardShell).toBe('function');
    expect(landingCardShell('image')).toEqual(expect.any(String));
  });

  it('does not re-export landingCardShell from ui-classes (static frame is landingCardFrame)', () => {
    expect('landingCardShell' in uiClasses).toBe(false);
    expect(typeof uiClasses.landingCardFrame).toBe('string');
  });
});
