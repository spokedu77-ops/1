import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const API_ROOT = join(ROOT, 'app/api/spokedu-master');

const RELATIVE_IMPORT_RE = /from\s+['"](\.\.?\/[^'"]+)['"]/g;

function listRouteFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) return listRouteFiles(fullPath);
    if (entry.isFile() && entry.name === 'route.ts') return [fullPath];
    return [];
  });
}

function resolveImportTarget(fromFile: string, importPath: string): string | null {
  const absoluteBase = resolve(dirname(fromFile), importPath);
  const candidates = [
    absoluteBase,
    `${absoluteBase}.ts`,
    `${absoluteBase}.tsx`,
    join(absoluteBase, 'index.ts'),
    join(absoluteBase, 'index.tsx'),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function collectRelativeImports(source: string): string[] {
  return [...source.matchAll(RELATIVE_IMPORT_RE)].map((match) => match[1]);
}

describe('SPOKEDU MASTER API route import contract', () => {
  const routeFiles = listRouteFiles(API_ROOT);

  it('indexes every spokedu-master API route file', () => {
    expect(routeFiles.length).toBeGreaterThan(0);
    expect(routeFiles).toContain(join(API_ROOT, 'students', '[id]', 'route.ts'));
  });

  it.each(routeFiles.map((file) => [relative(ROOT, file), file] as const))(
    'resolves relative imports in %s',
    (_label, filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const imports = collectRelativeImports(source);

      for (const importPath of imports) {
        const resolved = resolveImportTarget(filePath, importPath);
        expect(
          resolved,
          `${relative(ROOT, filePath)} -> ${importPath}`,
        ).not.toBeNull();
      }
    },
  );

  it('uses the shared operational-data module from nested student routes', () => {
    const source = readFileSync(join(API_ROOT, 'students', '[id]', 'route.ts'), 'utf8');
    expect(source).toContain("from '@/app/api/spokedu-master/operational-data'");
    expect(source).not.toContain("from '../operational-data'");
  });
});
