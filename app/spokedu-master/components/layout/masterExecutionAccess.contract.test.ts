import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const shell = read('app/spokedu-master/components/layout/AppShell.tsx');
const spomove = read('app/spokedu-master/spomove/session/page.tsx');

describe('MASTER execution screen access boundary', () => {
  it('redirects 401 to login while preserving the current next URL', () => {
    expect(shell).toContain('currentLoginRedirectHref()');
    expect(shell).toContain('router.replace(currentLoginRedirectHref())');
    expect(shell).toContain('window.location.pathname');
    expect(shell).toContain('window.location.search');
  });

  it('does not render session children before access is allowed', () => {
    const sessionBlock = shell.slice(
      shell.indexOf('if (isSession)'),
      shell.indexOf('<div className="min-h-dvh bg-[#eef2f7]', shell.indexOf('if (isSession)')),
    );
    expect(sessionBlock).toContain('isAccessGuardPending');
    expect(sessionBlock).toContain('isAccessGuardDenied');
    expect(sessionBlock).toContain('isAccessGuardError');
  });

  it('uses the common shell guard for SPOMOVE session', () => {
    expect(shell).toContain('pathname.startsWith(`${basePath}/spomove/session`)');
    expect(shell).not.toContain('pathname.startsWith(`${basePath}/class-mode`)');
    expect(spomove).not.toContain("fetch('/api/spokedu-master/access'");
    expect(spomove).not.toContain('OfficialAccessState');
  });
});
