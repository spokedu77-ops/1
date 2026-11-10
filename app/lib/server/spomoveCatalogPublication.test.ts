import { describe, expect, it, vi } from 'vitest';
vi.mock('./adminAuth', () => ({ getServiceSupabase: vi.fn() }));
vi.mock('@/app/spokedu-master/spomove/officialSpomovePresets', () => ({
  findOfficialSpomovePreset: (id: string) => ['new-activity', 'reaction-cognition-space-direction-01'].includes(id)
    ? { id, isReady: true } : undefined,
}));
import { stampSpomoveFirstPublication } from './spomoveCatalogPublication';

describe('first SPOMOVE upload/publication time', () => {
  const first = '2026-11-11T00:00:00Z';
  const later = '2026-11-20T00:00:00Z';
  it('stamps a newly uploaded public activity once', () => {
    const pack = stampSpomoveFirstPublication(null, { content: { 'new-activity': {} } }, first);
    expect(pack.publication?.['new-activity'].firstPublishedAt).toBe(first);
    expect(stampSpomoveFirstPublication(pack, pack, later).publication?.['new-activity'].firstPublishedAt).toBe(first);
  });
  it('does not label legacy content NEW on title/image edits', () => {
    const pack = stampSpomoveFirstPublication(null, { content: { 'reaction-cognition-space-direction-01': {} } }, first);
    expect(pack.publication?.['reaction-cognition-space-direction-01']).toEqual({ state: 'unknown' });
  });
  it('keeps drafts unmarked until the normal first public save', () => {
    const draft = stampSpomoveFirstPublication(null, { content: { 'new-activity': { isVisible: false } } }, first);
    expect(draft.publication?.['new-activity']).toEqual({ state: 'never' });
    const published = stampSpomoveFirstPublication(draft, { content: { 'new-activity': {} } }, later);
    expect(published.publication?.['new-activity'].firstPublishedAt).toBe(later);
  });
  it('preserves the first date across hiding, removing an override and republication', () => {
    const pack = stampSpomoveFirstPublication(null, { content: { 'new-activity': {} } }, first);
    const removed = stampSpomoveFirstPublication(pack, { content: {} }, later);
    const restored = stampSpomoveFirstPublication(removed, { content: { 'new-activity': {} } }, later);
    expect(restored.publication?.['new-activity'].firstPublishedAt).toBe(first);
  });
  it('ignores dates submitted by the editor', () => {
    const pack = stampSpomoveFirstPublication(null, { content: { 'new-activity': {} }, publication: { 'new-activity': { state: 'published', firstPublishedAt: later } } }, first);
    expect(pack.publication?.['new-activity'].firstPublishedAt).toBe(first);
  });
});
