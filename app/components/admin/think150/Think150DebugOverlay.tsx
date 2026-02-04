'use client';

import type { ValidateResult } from '@/app/lib/admin/engines/think150/think150Validate';
import type { VerifyReport } from '@/app/lib/admin/engines/think150/think150Verify';

interface Think150DebugOverlayProps {
  result: ValidateResult;
  verifyReport?: VerifyReport | null;
  currentPhase?: string;
  currentFrame?: string;
}

export function Think150DebugOverlay({ result, verifyReport, currentPhase, currentFrame }: Think150DebugOverlayProps) {
  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-900/95 p-4 font-mono text-xs">
      <h4 className="mb-2 font-bold text-neutral-300">Debug Overlay</h4>
      {currentPhase != null && (
        <p>
          phase: <span className="text-cyan-400">{currentPhase}</span>
          {currentFrame != null && (
            <> | frame: <span className="text-amber-400">{currentFrame}</span></>
          )}
        </p>
      )}
      {result.errors.length > 0 && (
        <div className="mt-2 text-red-400">
          <strong>Errors:</strong>
          <ul className="list-inside list-disc">
            {result.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {result.warnings.length > 0 && (
        <div className="mt-2 text-amber-400">
          <strong>Warnings:</strong>
          <ul className="list-inside list-disc">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {result.isValid && result.errors.length === 0 && result.warnings.length === 0 && !verifyReport && (
        <p className="text-green-500">Validation OK</p>
      )}

      {verifyReport && (
        <div className="mt-4 space-y-2 border-t border-neutral-700 pt-4">
          <h5 className="font-bold text-neutral-300">검증 보고서</h5>
          {verifyReport.checks.map((c, i) => (
            <p key={i} className={c.passed ? 'text-green-500' : 'text-red-400'}>
              {c.passed ? '✓' : '✗'} {c.name}: {c.detail}
            </p>
          ))}
          <p className="text-neutral-400">
            연속동일 {verifyReport.stats.consecutiveSameCount}회 (
            {(verifyReport.stats.consecutiveSameRatio * 100).toFixed(1)}%)
          </p>
          <p className="text-neutral-400">
            색상: R{verifyReport.stats.colorDistribution.red} G{verifyReport.stats.colorDistribution.green} Y
            {verifyReport.stats.colorDistribution.yellow} B{verifyReport.stats.colorDistribution.blue}
          </p>
        </div>
      )}
    </div>
  );
}
