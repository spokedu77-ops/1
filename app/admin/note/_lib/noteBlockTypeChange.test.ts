import { describe, expect, it } from 'vitest';
import {
  buildContentForTypeChange,
  filterTurnIntoCommands,
  getBlockedTypeChangeReason,
} from './noteBlockTypeChange';

describe('buildContentForTypeChange turn-into parity', () => {
  const richHtml = '<p><strong>Hello</strong></p>';

  it('preserves html when converting text → quote', () => {
    const next = buildContentForTypeChange(
      { text: 'Hello', html: richHtml },
      'text',
      'quote',
    );
    expect(next.text).toBe('Hello');
    expect(next.html).toBe(richHtml);
  });

  it('preserves html when converting quote → callout', () => {
    const next = buildContentForTypeChange(
      { text: 'Note', html: richHtml },
      'quote',
      'callout',
    );
    expect(next.text).toBe('Note');
    expect(next.html).toBe(richHtml);
  });

  it('preserves html when converting callout → heading', () => {
    const next = buildContentForTypeChange(
      { text: 'Title', html: richHtml, icon: '💡' },
      'callout',
      'heading',
    );
    expect(next.text).toBe('Title');
    expect(next.html).toBe(richHtml);
  });

  it('preserves html when converting heading → quote', () => {
    const next = buildContentForTypeChange(
      { text: 'Heading', html: richHtml },
      'heading2',
      'quote',
    );
    expect(next.text).toBe('Heading');
    expect(next.html).toBe(richHtml);
  });

  it('carries toggle title when converting toggle → text', () => {
    const next = buildContentForTypeChange(
      { title: 'Toggle title', collapsed: true },
      'toggle',
      'text',
    );
    expect(next.text).toBe('Toggle title');
  });

  it('carries text into toggle title when converting text → toggle', () => {
    const next = buildContentForTypeChange(
      { text: 'Becomes title' },
      'text',
      'toggle',
    );
    expect(next.title).toBe('Becomes title');
  });

  it('preserves todo checked when converting text → todo', () => {
    const next = buildContentForTypeChange(
      { text: 'Task', checked: true },
      'text',
      'todo',
    );
    expect(next.text).toBe('Task');
    expect(next.checked).toBe(true);
  });

  it('preserves html when converting bulletList → quote', () => {
    const next = buildContentForTypeChange(
      { text: 'Item', html: richHtml },
      'bulletList',
      'quote',
    );
    expect(next.text).toBe('Item');
    expect(next.html).toBe(richHtml);
  });

  it('strips list marker text but keeps html when converting bulletList → text', () => {
    const next = buildContentForTypeChange(
      { text: '- Item', html: richHtml },
      'bulletList',
      'text',
    );
    expect(next.text).toBe('Item');
    expect(next.html).toBe(richHtml);
  });

  it('strips slash query when converting via slash menu', () => {
    expect(buildContentForTypeChange({ text: '/todo' }, 'text', 'todo').text).toBe('');
    expect(buildContentForTypeChange({ text: '/heading' }, 'text', 'heading').text).toBe('');
    expect(buildContentForTypeChange({ text: '/quote' }, 'text', 'quote').text).toBe('');
    expect(buildContentForTypeChange({ title: '/toggle' }, 'toggle', 'text').text).toBe('');
  });

  it('keeps non-slash text when converting types', () => {
    const next = buildContentForTypeChange({ text: 'Hello /world' }, 'text', 'quote');
    expect(next.text).toBe('Hello /world');
  });
});

describe('filterTurnIntoCommands', () => {
  it('allows quote and callout mutual conversion', () => {
    const commands = [
      { type: 'quote' as const, label: '인용' },
      { type: 'callout' as const, label: '콜아웃' },
      { type: 'heading' as const, label: '제목' },
    ];
    expect(filterTurnIntoCommands('quote', commands, { text: 'x' }).map((c) => c.type)).toEqual([
      'callout',
      'heading',
    ]);
    expect(filterTurnIntoCommands('callout', commands, { text: 'x' }).map((c) => c.type)).toEqual([
      'quote',
      'heading',
    ]);
  });

  it('blocks table and column from turn into', () => {
    expect(getBlockedTypeChangeReason('table', 'text', {})).toMatch(/표/);
    expect(getBlockedTypeChangeReason('columnList', 'text', {})).toMatch(/2단/);
    expect(filterTurnIntoCommands('table', [{ type: 'text', label: '텍스트' }], {})).toHaveLength(0);
  });
});
