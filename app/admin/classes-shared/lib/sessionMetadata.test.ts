import { describe, expect, it } from 'vitest';
import { jsonMetadataSpan, replaceSessionAssistants, validateSessionAssistants, postponeRestoreAvailability } from './sessionMetadata';
const ids = [1, 2, 3].map((n) => `70000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
const first = { id: ids[1], price: 0 };
const second = { id: ids[2], price: 35000 };
describe('assistant metadata is a surgical replacement, not a memo reconstruction', () => {
  for (const newline of ['\n', '\r\n']) it(`preserves every byte around the JSON (${JSON.stringify(newline)})`, () => {
    const prefix = `  일반 메모${newline}OTHER_META:{"text":"[] \\\" escaped"}${newline}EXTRA_TEACHERS:  `;
    const suffix = `${newline}POSTPONE_SNAPSHOT:[{"memo":"EXTRA_TEACHERS:[]","nested":[{},[]]}]${newline}TAIL:plain text  `;
    expect(replaceSessionAssistants(prefix + JSON.stringify([first]) + suffix, [first, second])).toBe(prefix + JSON.stringify([first, second]) + suffix);
  });
  it('preserves null/empty memo with no assignments', () => { expect(replaceSessionAssistants(null, [])).toBe(''); expect(replaceSessionAssistants('note  ', [])).toBe('note  '); });
  it('appends without trimming a memo or touching its snapshot', () => {
    const memo = 'note  \nPOSTPONE_SNAPSHOT:[{"oldMemo":"EXTRA_TEACHERS:[]"}]';
    expect(replaceSessionAssistants(memo, [first])).toBe(memo + '\nEXTRA_TEACHERS:' + JSON.stringify([first]));
  });
  it('removes only assignments, not the following snapshot', () => {
    expect(replaceSessionAssistants('EXTRA_TEACHERS:' + JSON.stringify([first]) + '\nPOSTPONE_SNAPSHOT:[]', [])).toBe('EXTRA_TEACHERS:[]\nPOSTPONE_SNAPSHOT:[]');
  });
  it('rejects duplicate real tags but ignores tags embedded in JSON strings', () => {
    expect(() => replaceSessionAssistants('EXTRA_TEACHERS:[]\nEXTRA_TEACHERS:[]', [])).toThrow('DUPLICATE');
    const memo = 'POSTPONE_SNAPSHOT:[{"oldMemo":"EXTRA_TEACHERS:[]"}]';
    expect(jsonMetadataSpan(memo, 'EXTRA_TEACHERS:')).toBeNull();
  });
  it.each(['EXTRA_TEACHERS:bad', 'EXTRA_TEACHERS:[{', 'EXTRA_TEACHERS:[{]}'])('refuses malformed metadata: %s', (memo) => expect(() => replaceSessionAssistants(memo, [])).toThrow());
  it('keeps both fees, including explicit zero, when only assistant two changes', () => {
    expect(JSON.parse(replaceSessionAssistants('EXTRA_TEACHERS:[]', [first, second]).split('EXTRA_TEACHERS:')[1])).toEqual([first, second]);
    expect(replaceSessionAssistants('EXTRA_TEACHERS:' + JSON.stringify([first, second]), [second])).toBe('EXTRA_TEACHERS:' + JSON.stringify([second]));
  });
});
describe('assistant draft validation', () => {
  it('accepts zero, one and two unique teachers', () => { for (const rows of [[], [first], [first, second]]) expect(validateSessionAssistants(rows, ids[0])).toBeNull(); });
  it.each([[{ id: '', price: 0 }], [{ id: 'bad', price: 0 }], [first, first], [{ id: ids[0], price: 0 }], [{ ...first, price: -1 }], [{ ...first, price: NaN }], [{ ...first, price: 1.5 }], [first, second, first]])('rejects invalid or duplicate IDs/fees', (...rows) => expect(validateSessionAssistants(rows, ids[0])).not.toBeNull());
});
describe('legacy postpone restore safety', () => {
  it('does not invent snapshots', () => { expect(postponeRestoreAvailability('ordinary note')).toBe('legacy'); expect(postponeRestoreAvailability('POSTPONE_SNAPSHOT:bad')).toBe('invalid'); expect(postponeRestoreAvailability('POSTPONE_SNAPSHOT:[]')).toBe('invalid'); });
  it('requires memo-aware snapshots to avoid overwriting later assistant edits', () => {
    const item = { id: ids[0], oldStartAt: '2026-11-01T01:00:00Z', shiftedStartAt: '2026-11-08T01:00:00Z' };
    expect(postponeRestoreAvailability('POSTPONE_SNAPSHOT:' + JSON.stringify([item]))).toBe('invalid');
    expect(postponeRestoreAvailability('POSTPONE_SNAPSHOT:' + JSON.stringify([{ ...item, oldMemo: null, shiftedMemo: 'EXTRA_TEACHERS:[]' }]))).toBe('snapshot');
  });
});
