import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SPOKEDU MASTER raw error exposure cleanup', () => {
  it('does not render caught.message on reachable payment, students, or report screens', () => {
    const payment = read('app/spokedu-master/payment/page.tsx');
    const students = read('app/spokedu-master/students/page.tsx');
    const report = read('app/spokedu-master/report/page.tsx');

    expect(payment).not.toContain('authError.message');
    expect(payment).not.toContain('setError(json.error');
    expect(students).not.toContain('setLegacyDeleteError(error instanceof Error ? error.message');
    expect(students).not.toContain('{issue.reason}');
    expect(students).not.toContain('{failure.reason}');
    expect(report).not.toContain('setSaveError(caught instanceof Error ? caught.message');
    expect(report).not.toContain('Failed to save explanation');
  });

  it('uses the shared safe client error helper on payment, students archive, and report paths', () => {
    expect(read('app/spokedu-master/payment/page.tsx')).toContain('toMasterClientError(res.status, json.error)');
    expect(read('app/spokedu-master/students/page.tsx')).toContain("getSafeMasterErrorMessage('validation'");
    expect(read('app/spokedu-master/report/page.tsx')).toContain('resolveSaveActionFeedback(caught, accessSnapshot)');
    expect(read('app/spokedu-master/lib/saveActionFeedback.ts')).toContain('GENERIC_SAVE_ERROR_MESSAGE');
  });

  it('keeps payment success failures status-based and avoids exposing payment keys or full order IDs in messages', () => {
    const success = read('app/spokedu-master/payment/success/page.tsx');

    expect(success).not.toContain('paymentKey}</');
    expect(success).not.toContain('orderId}</');
    expect(success).not.toContain('caught.message');
    expect(success).toContain("status === 'delayed' || status === 'access-failed'");
    expect(success).toContain('checkAccessActivation');
  });

  it('sanitizes raw DB errors from student and report APIs that feed reachable screens', () => {
    const students = read('app/api/spokedu-master/students/route.ts');
    const studentDelete = read('app/api/spokedu-master/students/[id]/route.ts');
    const explanations = read('app/api/spokedu-master/explanations/route.ts');
    const classRecords = read('app/api/spokedu-master/class-records/route.ts');
    const programs = read('app/api/spokedu-master/programs/route.ts');

    expect(students).not.toContain('{ error: error.message }');
    expect(students).not.toContain('{ error: existingError.message }');
    expect(studentDelete).not.toContain('{ error: existingError.message }');
    expect(studentDelete).not.toContain('{ error: error.message }');
    expect(explanations).not.toContain('{ error: error.message }');
    expect(explanations).not.toContain("insertError?.message ?? 'Explanation insert failed'");
    expect(explanations).not.toContain("error?.message ?? 'Explanation reload failed'");
    expect(classRecords).not.toContain('{ error: error.message }');
    expect(classRecords).not.toContain('{ error: existingError.message }');
    expect(classRecords).not.toContain('childError.message');
    expect(classRecords).not.toContain("insertError?.message ?? 'Record insert failed'");
    expect(programs).not.toContain('{ error: error.message }');
  });

  it('keeps monitoring context free of payment keys and full queries', () => {
    const monitoredApis = [
      read('app/api/spokedu-master/students/route.ts'),
      read('app/api/spokedu-master/students/[id]/route.ts'),
      read('app/api/spokedu-master/explanations/route.ts'),
    ].join('\n');
    const payment = read('app/spokedu-master/payment/page.tsx');

    expect(payment).not.toContain('reportError');
    expect(monitoredApis).not.toContain('paymentKey');
    expect(monitoredApis).not.toContain('orderId');
    expect(monitoredApis).not.toContain('window.location.search');
  });

  it('documents archive/import as reachable from the students screen without completing new import behavior', () => {
    const students = read('app/spokedu-master/students/page.tsx');
    const importer = read('app/spokedu-master/lib/importLegacyOperationalData.ts');

    expect(students).toContain('handlePreviewLegacyImport');
    expect(students).toContain('handleImportLegacy');
    expect(students).toContain('handleDeleteLegacyArchive');
    expect(importer).toContain('importLegacyOperationalData');
  });
});
