import { describe, expect, it } from 'vitest';
import {
  centerCriminalCheckPathPrefix,
  isCenterCriminalCheckPath,
  sanitizeCriminalCheckFileName,
} from './criminalCheckFiles';

const CENTER_ID = '11111111-1111-4111-8111-111111111111';

describe('center criminal-check file boundary', () => {
  it('accepts only the selected center criminal-check prefix', () => {
    const path = `${centerCriminalCheckPathPrefix(CENTER_ID)}file.pdf`;
    expect(isCenterCriminalCheckPath(CENTER_ID, path)).toBe(true);
    expect(isCenterCriminalCheckPath('22222222-2222-4222-8222-222222222222', path)).toBe(false);
    expect(isCenterCriminalCheckPath(CENTER_ID, `${centerCriminalCheckPathPrefix(CENTER_ID)}../file.pdf`)).toBe(false);
    expect(isCenterCriminalCheckPath(CENTER_ID, `/centers/${CENTER_ID}/criminal-check/file.pdf`)).toBe(false);
  });

  it('removes unsafe object-key characters from uploaded names', () => {
    expect(sanitizeCriminalCheckFileName('../../민감 문서.PDF')).toBe('file.pdf');
    expect(sanitizeCriminalCheckFileName('report final?.DOCX')).toBe('report_final.docx');
  });
});
