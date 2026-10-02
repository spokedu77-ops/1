import { describe, expect, it } from 'vitest';
import { getMasterOtpSendErrorMessage } from './useMasterEmailOtp';

describe('MASTER email OTP safe errors', () => {
  it('shows a safe rate-limit message from stable status/code fields', () => {
    expect(getMasterOtpSendErrorMessage({ status: 429 }))
      .toBe('인증 요청이 많습니다. 잠시 후 다시 인증 코드를 요청해 주세요.');
    expect(getMasterOtpSendErrorMessage({ code: 'over_email_send_rate_limit' }))
      .toBe('인증 요청이 많습니다. 잠시 후 다시 인증 코드를 요청해 주세요.');
  });

  it('keeps unknown provider errors generic', () => {
    expect(getMasterOtpSendErrorMessage({ status: 500, code: 'unexpected_failure' }))
      .toBe('로그인 코드를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.');
  });
});
