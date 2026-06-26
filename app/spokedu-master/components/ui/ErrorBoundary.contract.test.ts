import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/spokedu-master/components/ui/ErrorBoundary.tsx'),
  'utf8',
);

describe('SPOKEDU MASTER ErrorBoundary contract', () => {
  it('does not render raw exception messages, stacks, or DB details', () => {
    expect(source).not.toContain('this.state.message');
    expect(source).not.toContain('error.message');
    expect(source).not.toContain('componentStack}</');
    expect(source).toContain('화면을 불러오지 못했습니다.');
    expect(source).toContain('잠시 후 다시 시도해 주세요.');
    expect(source).toContain('오류 ID: {this.state.errorId}');
  });

  it('reports each boundary error to monitoring once with safe context only', () => {
    expect(source).toContain("context: 'spokedu_master.error_boundary'");
    expect(source).toContain('if (this.reportedErrorId === errorId) return;');
    expect(source).toContain('this.reportedErrorId = errorId;');
    expect(source).toContain('componentStack: Boolean(errorInfo.componentStack)');
    expect(source).toContain('pathname: getSafePathname()');
    expect(source).not.toContain('email');
    expect(source).not.toContain('studentName');
    expect(source).not.toContain('explanationText');
    expect(source).not.toContain('window.location.search');
  });

  it('does not let monitoring failures break the fallback UI', () => {
    expect(source).toContain('reportError(error');
    expect(source).toContain('.catch(() => undefined)');
  });

  it('uses reload or an explicit reset callback for retry and keeps home fallback', () => {
    expect(source).toContain('this.props.onReset()');
    expect(source).toContain('window.location.reload()');
    expect(source).toContain("fallbackHref = '/spokedu-master/dashboard'");
    expect(source).toContain('다시 시도');
  });

  it('keeps accessible alert semantics and decorative icon hidden', () => {
    expect(source).toContain('role="alert"');
    expect(source).toContain('aria-hidden="true"');
    expect(source).toContain('focus-visible:outline');
  });
});
