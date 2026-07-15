import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER provider error sanitization contract', () => {
  const providers = [
    'app/spokedu-master/operational/OperationalDataProvider.tsx',
    'app/spokedu-master/explanations/ExplanationDataProvider.tsx',
  ];

  it.each(providers)('%s does not store raw API error messages in UI state', (path) => {
    const source = read(path);

    expect(source).toContain('masterFetchJson');
    expect(source).toContain('getMasterRequestErrorMessage(caught)');
    expect(source).toContain('setError(getProviderErrorMessage(caught))');
    expect(source).not.toContain('setError(caught instanceof Error ? caught.message');
    expect(source).not.toContain('throw new Error(json.error');
    expect(source).not.toContain('`HTTP ${response.status}`');
  });

  it('keeps raw response errors sanitized inside the shared request helper', () => {
    const helper = read('app/spokedu-master/lib/masterRequestError.ts');

    expect(helper).toContain('toMasterClientError(response.status, json.error)');
    expect(helper).toContain('toNetworkMasterClientError()');
    expect(helper).not.toContain('throw new Error(json.error');
    expect(helper).not.toContain('`HTTP ${response.status}`');
  });

  it('keeps 400, 401, 403, server, and network wording centralized', () => {
    const helper = read('app/spokedu-master/lib/clientErrors.ts');

    expect(helper).toContain("'network'");
    expect(helper).toContain("'unauthorized'");
    expect(helper).toContain("'forbidden'");
    expect(helper).toContain("'validation'");
    expect(helper).toContain("'server'");
    expect(helper).toContain("'unexpected'");
    expect(helper).toContain('인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
    expect(helper).toContain('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    expect(helper).toContain('로그인이 필요합니다.');
    expect(helper).toContain('SPOKEDU MASTER 이용 권한을 확인해 주세요.');
  });
});
