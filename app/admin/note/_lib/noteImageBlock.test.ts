import { describe, expect, it } from 'vitest';
import {
  buildImageWidthPatch,
  imageBlockAlignClass,
  imageCaptionAlignClass,
  imageFrameWidthClass,
  imageFrameWidthStyle,
  readImageAlign,
  readImageWidth,
  readImageWidthPercent,
  snapImageWidthPercent,
} from './noteImageBlock';
import { contentForPastedBlock } from './notePasteBlocks';
import { parseClipboardHtmlToBlocks, shouldSplitHtmlPaste } from './notePasteHtml';

describe('noteImageBlock', () => {
  it('reads width and align with defaults', () => {
    expect(readImageWidth({})).toBe('full');
    expect(readImageWidth({ width: 'half' })).toBe('half');
    expect(readImageWidthPercent({})).toBe(100);
    expect(readImageWidthPercent({ width: 'half' })).toBe(50);
    expect(readImageWidthPercent({ widthPercent: 72 })).toBe(72);
    expect(readImageAlign({})).toBe('center');
    expect(readImageAlign({ align: 'left' })).toBe('left');
  });

  it('maps layout classes and width styles', () => {
    expect(imageFrameWidthClass('half')).toContain('50%');
    expect(imageFrameWidthStyle(66)).toEqual({ width: '66%', maxWidth: '66%' });
    expect(buildImageWidthPatch(40)).toEqual({ widthPercent: 40, width: 'half' });
    expect(buildImageWidthPatch(80)).toEqual({ widthPercent: 80, width: 'full' });
    expect(snapImageWidthPercent(10)).toBe(25);
    expect(imageBlockAlignClass('right')).toBe('ml-auto');
    expect(imageCaptionAlignClass('center')).toBe('text-center');
  });
});

describe('notePasteHtml media blocks', () => {
  it('parses figure and table html', () => {
    const imageSpecs = parseClipboardHtmlToBlocks(
      '<figure><img src="https://example.com/a.png" alt="alt"><figcaption>caption</figcaption></figure>',
    );
    expect(imageSpecs).toEqual([
      { type: 'image', text: '', imageUrl: 'https://example.com/a.png', caption: 'caption' },
    ]);
    expect(shouldSplitHtmlPaste(imageSpecs!)).toBe(true);
    expect(contentForPastedBlock(imageSpecs![0], {})).toMatchObject({
      url: 'https://example.com/a.png',
      caption: 'caption',
      width: 'full',
      align: 'center',
    });

    const tableSpecs = parseClipboardHtmlToBlocks(
      '<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>',
    );
    expect(tableSpecs?.[0]?.type).toBe('table');
    expect(tableSpecs?.[0]?.tableContent?.rows).toHaveLength(2);
  });
});
