type BlockLike = {
  id: string;
  type: string;
  parent_block_id?: string | null;
  order_index: number;
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
  if (legacyBody.trim() || legacyBodyHtml.trim()) {
    return { text: legacyBody, html: legacyBodyHtml };
  }
  const title = typeof content?.title === 'string' ? content.title.trim() : '';
  const inlineText = typeof content?.text === 'string' ? content.text.trim() : '';
  const inlineHtml = typeof content?.html === 'string' ? content.html : '';
  const legacyText = typeof content?.legacyText === 'string' ? content.legacyText.trim() : '';
  const inlineBody = inlineText || legacyText;
  if (inlineBody && inlineBody !== title) {
    return { text: inlineBody, html: inlineHtml };
  }
  if (inlineHtml.trim() && inlineHtml !== `<p>${title}</p>`) {
    return { text: inlineBody, html: inlineHtml };
  }
  return { text: '', html: '' };
}

export function buildToggleBodyTextBlockContent(content: Record<string, unknown>) {
  const { text, html } = resolveToggleBodyForDisplay(content);
  return {
    text,
    ...(html.trim() ? { html } : {}),
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
  const { text: inlineBody, html: inlineHtml } = resolveToggleBodyForDisplay(content);
  if (inlineBody.trim()) {
    delete next.text;
    delete next.legacyText;
  }
  if (inlineHtml.trim()) {
    delete next.html;
  }
  return next;
}

export function findMigratedToggleBodyChild<T extends BlockLike>(toggleId: string, blocks: T[]): T | undefined {
  return blocks.find(
    (block) =>
      block.parent_block_id === toggleId
      && block.type === 'text'
      && block.content?.migratedFromToggleBody === true,
  );
}

/** legacy body → 자식 text 블록 forward migration 계획 */
export type ToggleBodyForwardPlan = {
  toggleId: string;
  newToggleContent: Record<string, unknown>;
  createChild?: {
    content: Record<string, unknown>;
    order_index: number;
  };
  updateChild?: {
    id: string;
    content: Record<string, unknown>;
  };
};

function isEmptyTextBlock(block: BlockLike): boolean {
  if (block.type !== 'text') return false;
  const text = typeof block.content?.text === 'string' ? block.content.text : '';
  const html = typeof block.content?.html === 'string' ? block.content.html : '';
  return !text.trim() && !html.trim();
}

function toggleChildren<T extends BlockLike>(toggleId: string, blocks: T[]): T[] {
  return blocks
    .filter((entry) => entry.parent_block_id === toggleId)
    .sort((a, b) => a.order_index - b.order_index);
}

function hasDisplayableToggleChildren<T extends BlockLike>(toggleId: string, blocks: T[]): boolean {
  return toggleChildren(toggleId, blocks).some((child) => {
    if (child.type === 'text') return !isEmptyTextBlock(child);
    return true;
  });
}

function mergeTextBlockContent(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const base = (existing ?? {}) as Record<string, unknown>;
  const nextText = typeof incoming.text === 'string' ? incoming.text : '';
  const baseText = typeof base.text === 'string' ? base.text : '';
  const mergedText = baseText.trim() && nextText.trim()
    ? `${baseText.trim()}\n${nextText.trim()}`
    : (nextText.trim() || baseText);
  const nextHtml = typeof incoming.html === 'string' ? incoming.html : '';
  const baseHtml = typeof base.html === 'string' ? base.html : '';
  return {
    ...base,
    ...incoming,
    text: mergedText,
    ...(nextHtml.trim() || baseHtml.trim()
      ? { html: baseHtml.trim() && nextHtml.trim() ? `${baseHtml}${nextHtml}` : (nextHtml || baseHtml) }
      : {}),
    migratedFromToggleBody: true,
  };
}

/**
 * 노션 모델: 토글 본문은 content.body가 아니라 parent_block_id 자식 블록으로만 표현.
 * legacy body/legacyBody가 있으면 첫 text 자식으로 옮기고 toggle content에서 제거한다.
 */
export function planToggleBodyForwardMigrations<T extends BlockLike>(
  blocks: T[],
): ToggleBodyForwardPlan[] {
  const plans: ToggleBodyForwardPlan[] = [];

  for (const block of blocks) {
    if (block.type !== 'toggle') continue;
    const content = (block.content ?? {}) as Record<string, unknown>;
    const hasLegacyBody = hasToggleBodyContent(content);
    if (!hasLegacyBody) continue;
    /** 이미 마이그레이션됨 — 사용자 삭제가 우선, legacy archive로 자식 재생성 금지 */
    if (content.bodyMigrated === true) continue;

    const childContent = buildToggleBodyTextBlockContent(content);
    const clearedContent = {
      ...clearToggleBodyContent(content),
      legacyBody: '',
      legacyBodyHtml: '',
    };
    const children = toggleChildren(block.id, blocks);

    const migratedChild = findMigratedToggleBodyChild(block.id, blocks);
    const firstTextChild = children.find((entry) => entry.type === 'text');

    if (migratedChild) {
      plans.push({
        toggleId: block.id,
        newToggleContent: clearedContent,
        updateChild: {
          id: migratedChild.id,
          content: mergeTextBlockContent(
            migratedChild.content as Record<string, unknown>,
            childContent,
          ),
        },
      });
      continue;
    }

    if (firstTextChild && isEmptyTextBlock(firstTextChild)) {
      plans.push({
        toggleId: block.id,
        newToggleContent: clearedContent,
        updateChild: {
          id: firstTextChild.id,
          content: { ...childContent, migratedFromToggleBody: true },
        },
      });
      continue;
    }

    const minOrder = children.length > 0
      ? Math.min(...children.map((entry) => entry.order_index))
      : 0;
    plans.push({
      toggleId: block.id,
      newToggleContent: clearedContent,
      createChild: {
        content: childContent,
        order_index: children.length > 0 ? minOrder - 1 : 0,
      },
    });
  }

  return plans;
}

/** forward migration 결과를 메모리 블록 배열에 반영 (테스트·클라이언트 미리보기용) */
export function applyToggleBodyForwardPlansInMemory<T extends BlockLike>(
  blocks: T[],
  plans: ToggleBodyForwardPlan[],
): T[] {
  if (plans.length === 0) return blocks;
  let next = [...blocks];
  for (const plan of plans) {
    next = next.map((block) => (
      block.id === plan.toggleId
        ? { ...block, content: plan.newToggleContent }
        : block
    ));
    if (plan.updateChild) {
      next = next.map((block) => (
        block.id === plan.updateChild!.id
          ? { ...block, content: plan.updateChild!.content }
          : block
      ));
    }
    if (plan.createChild) {
      next = [
        ...next,
        {
          id: `toggle-body-${plan.toggleId}`,
          type: 'text',
          parent_block_id: plan.toggleId,
          order_index: plan.createChild.order_index,
          content: plan.createChild.content,
        } as unknown as T,
      ];
    }
  }
  return next;
}
