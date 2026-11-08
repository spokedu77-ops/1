import { beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
const mocks = vi.hoisted(() => ({ from: vi.fn(), upload: vi.fn(), storage: vi.fn(), remove: vi.fn(), insert: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/app/lib/server/adminAuth', () => ({ requireAdmin: async () => ({ ok: true, userId: '11111111-1111-4111-8111-111111111111' }), getServiceSupabase: () => ({ from: mocks.from, storage: { from: mocks.storage } }) }));
import { POST } from './route';
const id = '22222222-2222-4222-8222-222222222222';
function request(bytes: Uint8Array, type = 'image/jpeg') {
  const body = new FormData(); body.set('recordId', id); body.set('file', new File([new Uint8Array(bytes)], 'photo.jpg', { type }));
  return new Request('http://localhost/api/admin/field-records/media', { method: 'POST', body });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockImplementation(table => table === 'field_records' ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id }, error: null }) }) }) } : { insert: mocks.insert });
  mocks.storage.mockReturnValue({ upload: mocks.upload, remove: mocks.remove });
  mocks.upload.mockResolvedValue({ error: null }); mocks.insert.mockResolvedValue({ error: null }); mocks.remove.mockResolvedValue({ error: null });
});
describe('field record photo ingestion', () => {
  it('checks real file contents, preserves ratio and writes only to the private bucket', async () => {
    const bytes = await sharp({ create: { width: 3600, height: 1800, channels: 3, background: '#88aacc' } }).jpeg().toBuffer();
    const response = await POST(request(bytes)); expect(response.status).toBe(201);
    expect(mocks.storage).toHaveBeenCalledWith('field-record-media');
    const [path, encoded, options] = mocks.upload.mock.calls[0];
    expect(path).toMatch(new RegExp(`^${id}/[a-f0-9-]+\\.webp$`));
    expect(options).toEqual({ contentType: 'image/webp', upsert: false });
    const metadata = await sharp(encoded).metadata(); expect(metadata.width).toBe(2400); expect(metadata.height).toBe(1200); expect(metadata.exif).toBeUndefined();
    const body = await response.json(); expect(body.media.publicConfirmed).toBe(false); expect(body.media).not.toHaveProperty('object_path');
  });
  it('rejects SVG even if its name and declared type claim JPEG', async () => {
    const response = await POST(request(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')));
    expect(response.status).toBe(400); expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('rejects files over the limit before reading or uploading', async () => {
    const response = await POST(request(new Uint8Array(10 * 1024 * 1024 + 1)));
    expect(response.status).toBe(400); expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('cleans up private storage when media metadata could not be saved', async () => {
    mocks.insert.mockResolvedValue({ error: { message: 'DB failure' } });
    const bytes = await sharp({ create: { width: 20, height: 10, channels: 3, background: '#fff' } }).jpeg().toBuffer();
    expect((await POST(request(bytes))).status).toBe(503);
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
  });
});
