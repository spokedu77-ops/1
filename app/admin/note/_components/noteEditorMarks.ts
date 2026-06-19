import { Mark, mergeAttributes } from '@tiptap/core';

export const NoteTextColor = Mark.create({
  name: 'textColor',
  inclusive: true,
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => (element as HTMLElement).style?.color?.replace(/['"]+/g, '') || null,
        renderHTML: (attributes) => {
          if (!attributes.color) return {};
          return { style: `color: ${attributes.color}` };
        },
      },
    };
  },
  parseHTML() {
    return [{
      tag: 'span[style]',
      getAttrs: (node) => {
        const color = (node as HTMLElement).style?.color;
        return color ? { color } : false;
      },
    }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

export const NoteHighlight = Mark.create({
  name: 'highlight',
  inclusive: true,
  addAttributes() {
    return {
      color: {
        default: '#fef08a',
        parseHTML: (element) => {
          const el = element as HTMLElement;
          return el.style?.backgroundColor || el.getAttribute('data-highlight-color') || '#fef08a';
        },
        renderHTML: (attributes) => ({
          'data-highlight-color': attributes.color,
          style: `background-color: ${attributes.color}; border-radius: 0.125rem`,
        }),
      },
    };
  },
  parseHTML() {
    return [
      { tag: 'mark' },
      {
        tag: 'span[data-highlight-color]',
        getAttrs: (node) => ({
          color: (node as HTMLElement).getAttribute('data-highlight-color')
            || (node as HTMLElement).style?.backgroundColor
            || '#fef08a',
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(HTMLAttributes), 0];
  },
});
