import { describe, expect, it } from 'vitest';
import {
  codeLanguageLabel,
  normalizeCodeLanguage,
  parseCodeLanguageFromClassName,
  readCodeLanguage,
} from './noteCodeBlock';
import { parseClipboardHtmlToBlocks } from './notePasteHtml';
import { contentForPastedBlock } from './notePasteBlocks';

describe('noteCodeBlock', () => {
  it('normalizes common language aliases', () => {
    expect(normalizeCodeLanguage('js')).toBe('javascript');
    expect(normalizeCodeLanguage('TS')).toBe('typescript');
    expect(normalizeCodeLanguage('unknown-lang')).toBe('plain');
  });

  it('reads language from block content', () => {
    expect(readCodeLanguage({ language: 'python' })).toBe('python');
    expect(codeLanguageLabel('python')).toBe('Python');
  });

  it('parses language from code class names', () => {
    expect(parseCodeLanguageFromClassName('language-typescript highlight')).toBe('typescript');
    expect(parseCodeLanguageFromClassName('lang-bash')).toBe('bash');
  });
});

describe('notePasteHtml code blocks', () => {
  it('preserves multiline code and language when pasting pre/code html', () => {
    const specs = parseClipboardHtmlToBlocks(
      '<pre><code class="language-python">line1\nline2</code></pre>',
    );
    expect(specs).toEqual([
      { type: 'code', text: 'line1\nline2', language: 'python' },
    ]);
    expect(contentForPastedBlock(specs![0], {})).toMatchObject({
      text: 'line1\nline2',
      language: 'python',
    });
  });
});
