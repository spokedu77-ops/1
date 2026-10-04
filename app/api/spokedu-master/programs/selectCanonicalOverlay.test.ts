import { describe, expect, it } from 'vitest';
import { selectCanonicalPublishedProgramOverlays } from './selectCanonicalOverlay';

describe('MASTER published program overlay selection', () => {
  it('prefers the latest updated_at regardless of input order', () => {
    const earlier = {
      id: 200,
      source_center_curriculum_id: 40,
      updated_at: '2026-06-01T00:00:00.000Z',
      is_published: true,
      title: 'Earlier overlay',
      video_url: 'https://example.test/earlier',
    };
    const later = {
      ...earlier,
      id: 100,
      updated_at: '2026-07-01T00:00:00.000Z',
      title: 'Later overlay',
      video_url: 'https://example.test/later',
    };
    const allowed = new Set([40]);

    expect(selectCanonicalPublishedProgramOverlays([earlier, later], allowed).get(40)).toEqual(later);
    expect(selectCanonicalPublishedProgramOverlays([later, earlier], allowed).get(40)).toEqual(later);
  });

  it('uses the higher stable primary key when published rows have the same updated_at regardless of input order', () => {
    const olderId = {
      id: 1313,
      source_center_curriculum_id: 204,
      updated_at: '2026-07-06T13:13:03.540277Z',
      is_published: true,
      title: 'Foamstick fencing legacy',
      video_url: 'https://example.test/older',
    };
    const higherId = {
      id: 1329,
      source_center_curriculum_id: 204,
      updated_at: '2026-07-06T13:13:03.540277Z',
      is_published: true,
      title: 'Foamstick fencing canonical',
      video_url: 'https://example.test/canonical',
    };
    const allowed = new Set([204]);

    const forward = selectCanonicalPublishedProgramOverlays([olderId, higherId], allowed).get(204);
    const reversed = selectCanonicalPublishedProgramOverlays([higherId, olderId], allowed).get(204);

    expect(forward).toEqual(higherId);
    expect(reversed).toEqual(higherId);
  });

  it('uses the stable primary key when updated_at is null or invalid', () => {
    const nullTimestamp = {
      id: 10,
      source_center_curriculum_id: 92,
      updated_at: null,
      is_published: true,
    };
    const invalidTimestamp = {
      ...nullTimestamp,
      id: 11,
      updated_at: 'not-a-timestamp',
    };
    const allowed = new Set([92]);

    expect(selectCanonicalPublishedProgramOverlays([nullTimestamp, invalidTimestamp], allowed).get(92)).toEqual(invalidTimestamp);
    expect(selectCanonicalPublishedProgramOverlays([invalidTimestamp, nullTimestamp], allowed).get(92)).toEqual(invalidTimestamp);
  });
});
