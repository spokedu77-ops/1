import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('sessionDateTime formatter reuse', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('reuses module-level formatters across repeated calls', async () => {
    const RealDateTimeFormat = Intl.DateTimeFormat;
    let created = 0;
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function MockDateTimeFormat(...args: ConstructorParameters<typeof Intl.DateTimeFormat>) {
      created += 1;
      return new RealDateTimeFormat(...args);
    } as unknown as typeof Intl.DateTimeFormat);

    const { formatSeoulSessionDay, toSeoulDateTimeInput } = await import('./sessionDateTime');
    toSeoulDateTimeInput('2026-08-22T14:30:00.000Z');
    toSeoulDateTimeInput('2026-08-23T00:30:00.000Z');
    formatSeoulSessionDay('2026-08-22', { month: 'long', day: 'numeric' });
    formatSeoulSessionDay('2026-08-23', { month: 'long', day: 'numeric' });

    expect(created).toBeLessThanOrEqual(2);
    vi.restoreAllMocks();
  });
});
