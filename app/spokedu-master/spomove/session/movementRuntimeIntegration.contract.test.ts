import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('MASTER SPOMOVE movement runtime integration', () => {
  const page = read('app/spokedu-master/spomove/session/page.tsx');
  const router = read('app/spokedu-master/spomove/session/EngineRouter.tsx');
  const sheet = read('app/spokedu-master/spomove/movements/MovementChangeSheet.tsx');

  it('exposes movement change only inside the paused lifecycle', () => {
    expect(page).toContain("runtimeStateRef.current !== 'paused'");
    expect(page).toContain("movementSupport === 'supported'");
    expect(page).toContain('state === \'paused\' && movementSheetOpen');
    expect(page).toContain('setMovementSheetOpen(false)');
  });

  it('updates the Router HUD without key-remounting the engine', () => {
    expect(page).toContain('currentMovement={');
    expect(router).toContain('<EngineRuntime {...runtimeProps} />');
    expect(router).toContain('<MovementHud');
    expect(router).not.toContain('key={currentMovement');
  });

  it('keeps the sheet keyboard-accessible above the pause overlay', () => {
    expect(sheet).toContain('data-spomove-movement-sheet');
    expect(sheet).toContain('z-[1001]');
    expect(sheet).toContain('aria-pressed={active}');
    expect(sheet).toContain('h-11 w-11');
    expect(sheet).toContain('min-h-11 w-full');
  });

  it('carries movement facts into result and record draft', () => {
    expect(page).toContain('initialMovement: movementStateRef.current.initialMovement');
    expect(page).toContain('finalMovement: movementStateRef.current.currentMovement');
    expect(page).toContain('movementChanges: movementStateRef.current.movementChanges');
    expect(page).toContain('movementChangeCount: sessionResult.movementChanges.length');
  });
});
