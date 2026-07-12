import { describe, expect, it } from 'vitest';
import {
  applyToggleBodyForwardPlansInMemory,
  planToggleBodyForwardMigrations,
} from './toggleBody';

function block(
  id: string,
  type: string,
  content: Record<string, unknown>,
  parentId?: string | null,
  order = 0,
) {
  return {
    id,
    type,
    parent_block_id: parentId ?? null,
    order_index: order,
    content,
  };
}

describe('planToggleBodyForwardMigrations', () => {
  it('body만 있는 토글 → text 자식 생성 + toggle body 비움', () => {
    const blocks = [block('t1', 'toggle', { title: '제목', body: '본문', collapsed: false })];
    const plans = planToggleBodyForwardMigrations(blocks);
    expect(plans).toHaveLength(1);
    expect(plans[0].toggleId).toBe('t1');
    expect(plans[0].createChild?.content).toMatchObject({ text: '본문', migratedFromToggleBody: true });
    expect(plans[0].newToggleContent.body).toBe('');
    expect(plans[0].newToggleContent.bodyMigrated).toBe(true);

    const migrated = applyToggleBodyForwardPlansInMemory(blocks, plans);
    expect(migrated).toHaveLength(2);
    const child = migrated.find((b) => b.parent_block_id === 't1');
    expect(child?.type).toBe('text');
    expect(child?.content?.text).toBe('본문');
  });

  it('빈 text 자식이 있으면 updateChild로 본문 이전', () => {
    const blocks = [
      block('t1', 'toggle', { body: '내용' }),
      block('c1', 'text', { text: '' }, 't1', 0),
    ];
    const plans = planToggleBodyForwardMigrations(blocks);
    expect(plans[0].updateChild?.id).toBe('c1');
    expect(plans[0].createChild).toBeUndefined();
  });

  it('이미 migrated 자식이 있으면 본문 병합', () => {
    const blocks = [
      block('t1', 'toggle', { body: '추가' }),
      block('c1', 'text', { text: '기존', migratedFromToggleBody: true }, 't1', 0),
    ];
    const plans = planToggleBodyForwardMigrations(blocks);
    expect(plans[0].updateChild?.content?.text).toBe('기존\n추가');
  });

  it('body가 없으면 계획 없음', () => {
    const blocks = [
      block('t1', 'toggle', { title: '만' }),
      block('c1', 'text', { text: '자식' }, 't1'),
    ];
    expect(planToggleBodyForwardMigrations(blocks)).toHaveLength(0);
  });

  it('migrates inline text/html on toggle when distinct from title', () => {
    const blocks = [block('t1', 'toggle', {
      title: '체육관 이용방법 (선생님/학부모 version 각각)',
      text: '체크 리스트',
      html: '<p>체크 리스트</p>',
      collapsed: true,
    })];
    const plans = planToggleBodyForwardMigrations(blocks);
    expect(plans).toHaveLength(1);
    expect(plans[0].createChild?.content).toMatchObject({ text: '체크 리스트' });
    expect(plans[0].newToggleContent.text).toBeUndefined();
    expect(plans[0].newToggleContent.title).toContain('체육관 이용방법');
  });

  it('bodyMigrated with orphaned legacyBody does not recreate child — user delete wins', () => {
    const blocks = [
      block('t1', 'toggle', {
        title: '체육관 이용방법',
        body: '',
        legacyBody: '과거 본문',
        bodyMigrated: true,
      }),
    ];

    expect(planToggleBodyForwardMigrations(blocks)).toHaveLength(0);
  });

  it('bodyMigrated with existing migrated child keeps legacy archived', () => {
    const blocks = [
      block('t1', 'toggle', {
        title: '제목',
        body: '',
        legacyBody: '과거 본문',
        bodyMigrated: true,
      }),
      block('c1', 'text', { text: '자식', migratedFromToggleBody: true }, 't1'),
    ];

    expect(planToggleBodyForwardMigrations(blocks)).toHaveLength(0);
  });
});
