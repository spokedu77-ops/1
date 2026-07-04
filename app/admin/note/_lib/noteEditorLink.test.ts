import { describe, expect, it, vi } from 'vitest';
import { applyLinkUrlToEditor } from './noteEditorLink';

function mockEditor(options: {
  empty?: boolean;
  from?: number;
  href?: string;
}) {
  const chain = {
    focus: vi.fn(function focus(this: typeof chain) { return this; }),
    extendMarkRange: vi.fn(function extendMarkRange(this: typeof chain) { return this; }),
    unsetLink: vi.fn(function unsetLink(this: typeof chain) { return this; }),
    insertContent: vi.fn(function insertContent(this: typeof chain) { return this; }),
    setTextSelection: vi.fn(function setTextSelection(this: typeof chain) { return this; }),
    setLink: vi.fn(function setLink(this: typeof chain) { return this; }),
    run: vi.fn(),
  };
  const editor = {
    state: {
      selection: {
        empty: options.empty ?? false,
        from: options.from ?? 1,
      },
    },
    getAttributes: () => ({ href: options.href ?? '' }),
    chain: () => chain,
  };
  return { editor, chain };
}

describe('applyLinkUrlToEditor', () => {
  it('removes link when url is empty', () => {
    const { editor, chain } = mockEditor({});
    applyLinkUrlToEditor(editor as never, '   ');
    expect(chain.unsetLink).toHaveBeenCalled();
  });

  it('sets link on selected text', () => {
    const { editor, chain } = mockEditor({ empty: false });
    applyLinkUrlToEditor(editor as never, 'https://example.com');
    expect(chain.setLink).toHaveBeenCalledWith({ href: 'https://example.com' });
  });

  it('inserts linked text when selection is empty', () => {
    const { editor, chain } = mockEditor({ empty: true, from: 3 });
    applyLinkUrlToEditor(editor as never, 'https://example.com');
    expect(chain.insertContent).toHaveBeenCalledWith('https://example.com');
    expect(chain.setLink).toHaveBeenCalledWith({ href: 'https://example.com' });
  });
});
