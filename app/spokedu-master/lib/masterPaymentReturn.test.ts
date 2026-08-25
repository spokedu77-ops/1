import { describe, expect, it } from 'vitest';
import { getFallbackForMasterIntent, getSafeMasterPostPaymentPath } from './masterPaymentReturn';

describe('master post-payment return path', () => {
  it('preserves SPOMOVE execution state query keys', () => {
    expect(
      getSafeMasterPostPaymentPath(
        '/spokedu-master/spomove/session?preset=simon-basic&mode=projector&sound=on&entry=start&program=funstick-fencing&paymentKey=x',
      ),
    ).toBe('/spokedu-master/spomove/session?preset=simon-basic&mode=projector&sound=on&entry=start&program=funstick-fencing');
  });

  it('keeps route-specific lesson and record query keys only', () => {
    expect(getSafeMasterPostPaymentPath('/spokedu-master/class-record?program=p1&record=r1&plan=premium')).toBe(
      '/spokedu-master/class-record?program=p1&record=r1',
    );
    expect(getSafeMasterPostPaymentPath('/spokedu-master/library/p1?from=dashboard&intent=open_library')).toBe(
      '/spokedu-master/library/p1?from=dashboard',
    );
  });

  it('blocks external, protocol-relative, script, legacy, and payment loop targets', () => {
    for (const input of [
      'https://evil.test/spokedu-master/spomove',
      '//evil.test/spokedu-master/spomove',
      'javascript:alert(1)',
      'data:text/html,hi',
      '/spokedu-master/class-mode/session',
      '/spokedu-master/payment?plan=premium',
      '/spokedu-master/payment/success?next=/spokedu-master/spomove',
    ]) {
      expect(getSafeMasterPostPaymentPath(input, '/spokedu-master/spomove')).toBe('/spokedu-master/spomove');
    }
  });

  it('provides intent-specific fallbacks', () => {
    expect(getFallbackForMasterIntent('open_library')).toBe('/spokedu-master/library');
    expect(getFallbackForMasterIntent('start_spomove')).toBe('/spokedu-master/spomove');
    expect(getFallbackForMasterIntent('continue_record')).toBe('/spokedu-master/class-record');
  });

  it('preserves exact Session and schedule context after payment', () => {
    expect(
      getSafeMasterPostPaymentPath(
        '/spokedu-master/activity?session=sess-1&date=2026-08-26&create=1&class=class-a&plan=premium',
      ),
    ).toBe('/spokedu-master/activity?session=sess-1&date=2026-08-26&create=1&class=class-a');
    expect(getSafeMasterPostPaymentPath('/spokedu-master/report?session=sess-1&plan=premium')).toBe(
      '/spokedu-master/report?session=sess-1',
    );
    expect(getSafeMasterPostPaymentPath('/spokedu-master/students/student-a?plan=premium')).toBe(
      '/spokedu-master/students/student-a',
    );
  });

  it('preserves SPOMOVE Hub discovery and Session origin through payment', () => {
    expect(
      getSafeMasterPostPaymentPath(
        '/spokedu-master/spomove?view=favorites&group=stroop&difficulty=normal&movement=visualSearch&q=%ED%99%94%EC%82%B4%ED%91%9C',
      ),
    ).toBe('/spokedu-master/spomove?view=favorites&group=stroop&difficulty=normal&movement=visualSearch&q=%ED%99%94%EC%82%B4%ED%91%9C');
    expect(
      getSafeMasterPostPaymentPath(
        '/spokedu-master/spomove/session?preset=simon-basic&session=sess-1&sessionProgram=prog-1&returnTo=%2Fspokedu-master%2Factivity%3Fsession%3Dsess-1&hubReturn=%2Fspokedu-master%2Fspomove%3Fgroup%3Dstroop',
      ),
    ).toContain('session=sess-1');
    expect(
      getSafeMasterPostPaymentPath(
        '/spokedu-master/spomove/session?preset=simon-basic&session=sess-1&returnTo=%2Fspokedu-master%2Factivity%3Fsession%3Dsess-1&hubReturn=%2Fspokedu-master%2Fspomove%3Fgroup%3Dstroop',
      ),
    ).toContain('returnTo=');
    expect(
      getSafeMasterPostPaymentPath(
        '/spokedu-master/spomove/session?preset=simon-basic&hubReturn=%2Fspokedu-master%2Fspomove%3Fgroup%3Dstroop',
      ),
    ).toContain('hubReturn=');
  });
});

