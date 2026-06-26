import { describe, expect, it } from 'vitest';
import { getSafeMasterErrorMessage, isSafeValidationMessage, toMasterClientError, toNetworkMasterClientError } from './clientErrors';

describe('SPOKEDU MASTER client error sanitization', () => {
  it('uses a connection message for network failures', () => {
    expect(toNetworkMasterClientError()).toEqual({
      kind: 'network',
      message: '인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
    });
  });

  it('distinguishes 401 and 403 without treating them as server failures', () => {
    expect(toMasterClientError(401, 'raw unauthorized')).toEqual({
      kind: 'unauthorized',
      message: '로그인이 필요합니다.',
      status: 401,
    });
    expect(toMasterClientError(403, 'raw forbidden')).toEqual({
      kind: 'forbidden',
      message: 'SPOKEDU MASTER 이용 권한을 확인해 주세요.',
      status: 403,
    });
  });

  it('keeps short safe validation messages', () => {
    expect(toMasterClientError(400, '날짜를 확인해 주세요.')).toEqual({
      kind: 'validation',
      message: '날짜를 확인해 주세요.',
      status: 400,
    });
  });

  it('maps conflicts to a safe reusable-request message', () => {
    expect(toMasterClientError(409, 'raw order_id conflict').message)
      .toBe('이미 처리되었거나 다시 사용할 수 없는 요청입니다.');
  });

  it('removes raw DB, UUID, stack, student, email, and body-like details from validation messages', () => {
    const unsafeMessages = [
      'duplicate key violates constraint spokedu_master_students_owner_legacy_unique',
      'invalid input syntax for type uuid 11111111-1111-4111-8111-111111111111',
      'stack trace at Provider',
      'student memo body contains private text',
      'email user@example.com failed',
      'payment order key failed',
    ];

    for (const message of unsafeMessages) {
      expect(isSafeValidationMessage(message)).toBe(false);
      expect(toMasterClientError(400, message).message).toBe('입력 내용을 확인해 주세요.');
    }
  });

  it('uses a general message for server and unexpected failures', () => {
    expect(toMasterClientError(500, 'raw private db failure').message)
      .toBe('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    expect(getSafeMasterErrorMessage('unexpected', 'throw new Error detail'))
      .toBe('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  });
});
