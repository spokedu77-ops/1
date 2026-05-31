type BlockLike = {
  id: string;
  type: string;
  parent_block_id?: string | null;
  content?: Record<string, unknown> | null;
};

export function hasToggleBodyContent(content: Record<string, unknown> | null | undefined) {
  const { text, html } = resolveToggleBodyForDisplay(content);
  return Boolean(text.trim() || html.trim());
}

export function resolveToggleBodyForDisplay(content: Record<string, unknown> | null | undefined): {
  text: string;
  html: string;
} {
  const body = typeof content?.body === 'string' ? content.body : '';
  const bodyHtml = typeof content?.bodyHtml === 'string' ? content.bodyHtml : '';
  if (body.trim() || bodyHtml.trim()) {
    return { text: body, html: bodyHtml };
  }
  const legacyBody = typeof content?.legacyBody === 'string' ? content.legacyBody : '';
  const legacyBodyHtml = typeof content?.legacyBodyHtml === 'string' ? content.legacyBodyHtml : '';
  return { text: legacyBody, html: legacyBodyHtml };
}

export function buildToggleBodyTextBlockContent(content: Record<string, unknown>) {
  const { text, html } = resolveToggleBodyForDisplay(content);
  return {
    text,
    ...(html.trim() ? { html } : {}),
    depth: 0,
    migratedFromToggleBody: true,
  };
}

export function clearToggleBodyContent(content: Record<string, unknown>) {
  const next: Record<string, unknown> = {
    ...content,
    body: '',
    bodyHtml: '',
    bodyMigrated: true,
  };
  if (typeof content.body === 'string' && content.body.trim()) {
    next.legacyBody = content.body;
  }
  if (typeof content.bodyHtml === 'string' && content.bodyHtml.trim()) {
    next.legacyBodyHtml = content.bodyHtml;
  }
  return next;
}

export function buildToggleBodyRestoreContent(
  content: Record<string, unknown>,
  source: { text: string; html?: string },
): Record<string, unknown> {
  return {
    ...content,
    body: source.text,
    bodyHtml: source.html ?? '',
    bodyRestored: true,
  };
}

export function findMigratedToggleBodyChild<T extends BlockLike>(toggleId: string, blocks: T[]): T | undefined {
  return blocks.find(
    (block) =>
      block.parent_block_id === toggleId
      && block.type === 'text'
      && block.content?.migratedFromToggleBody === true,
  );
}

export type ToggleBodyRestorePlan = {
  toggleId: string;
  restoredContent: Record<string, unknown>;
  removeChildBlockId?: string;
  purgeTrashedChildBlockId?: string;
};

/** body가 비었는데 legacy·마이그레이션 자식 블록에 본문이 남아 있으면 복구 계획을 만든다. */
export function planToggleBodyRestores<T extends BlockLike>(
  blocks: T[],
  trashedBlocks: T[] = [],
): ToggleBodyRestorePlan[] {
  const plans: ToggleBodyRestorePlan[] = [];
  const activeIds = new Set(blocks.map((block) => block.id));

  for (const block of blocks) {
    if (block.type !== 'toggle') continue;
    const content = (block.content ?? {}) as Record<string, unknown>;
    if (hasToggleBodyContent(content)) continue;

    const legacy = resolveToggleBodyForDisplay(content);
    const migratedChild =
      findMigratedToggleBodyChild(block.id, blocks)
      ?? findMigratedToggleBodyChild(block.id, trashedBlocks);

    let sourceText = legacy.text;
    let sourceHtml = legacy.html;
    let removeChildBlockId: string | undefined;
    let purgeTrashedChildBlockId: string | undefined;

    if (migratedChild) {
      const childText = typeof migratedChild.content?.text === 'string' ? migratedChild.content.text : '';
      const childHtml = typeof migratedChild.content?.html === 'string' ? migratedChild.content.html : '';
      if (childText.trim() || childHtml.trim()) {
        sourceText = childText;
        sourceHtml = childHtml;
        if (activeIds.has(migratedChild.id)) {
          removeChildBlockId = migratedChild.id;
        } else {
          purgeTrashedChildBlockId = migratedChild.id;
        }
      }
    }

    if (!sourceText.trim() && !sourceHtml.trim()) continue;

    plans.push({
      toggleId: block.id,
      restoredContent: buildToggleBodyRestoreContent(content, {
        text: sourceText,
        html: sourceHtml || undefined,
      }),
      removeChildBlockId,
      purgeTrashedChildBlockId,
    });
  }

  return plans;
}
