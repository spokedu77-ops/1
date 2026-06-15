import { describe, expect, it, vi } from 'vitest';

import { loadSavedAdminProgram } from './savedProgram';

describe('loadSavedAdminProgram', () => {
  it('reads only one curriculum overlay and meta', async () => {
    const readOverlay = vi.fn().mockResolvedValue({
      data: { id: 39, source_center_curriculum_id: 52 },
      error: null,
    });
    const readMeta = vi.fn().mockResolvedValue({
      data: { curriculum_id: 52 },
      error: null,
    });

    await expect(loadSavedAdminProgram(52, { readOverlay, readMeta })).resolves.toEqual({
      curriculumId: 52,
      overlay: { id: 39, source_center_curriculum_id: 52 },
      meta: { curriculum_id: 52 },
    });
    expect(readOverlay).toHaveBeenCalledOnce();
    expect(readOverlay).toHaveBeenCalledWith(52);
    expect(readMeta).toHaveBeenCalledOnce();
    expect(readMeta).toHaveBeenCalledWith(52);
  });

  it('fails at the single-program reload when a row is unavailable', async () => {
    await expect(loadSavedAdminProgram(52, {
      readOverlay: vi.fn().mockResolvedValue({ data: null, error: null }),
      readMeta: vi.fn().mockResolvedValue({ data: { curriculum_id: 52 }, error: null }),
    })).rejects.toThrow('Saved overlay not found');
  });
});
