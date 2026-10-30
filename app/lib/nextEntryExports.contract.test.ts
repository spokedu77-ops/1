import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// Keep reusable value exports in ordinary modules, outside Next entry files.
const shared = [
  'config', 'generateStaticParams', 'unstable_instant', 'unstable_dynamicStaleTime',
  'revalidate', 'dynamic', 'dynamicParams', 'fetchCache', 'preferredRegion', 'runtime', 'maxDuration',
];

function entries(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? entries(file) : /^(page|route)\.tsx?$/.test(entry.name) ? [file] : [];
  });
}

describe('Next page and route value export boundary', () => {
  it('exposes only supported Next entry values', () => {
    const unexpected: string[] = [];
    for (const file of entries(join(process.cwd(), 'app'))) {
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      const route = /[\\/]route\.tsx?$/.test(file);
      const allowed = new Set([...shared, ...(route
        ? ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'DELETE', 'PATCH']
        : ['default', 'metadata', 'generateMetadata', 'viewport', 'generateViewport'])]);
      const check = (name: string) => {
        if (!allowed.has(name)) unexpected.push(`${relative(process.cwd(), file)}: ${name}`);
      };
      const binding = (name: ts.BindingName) => {
        if (ts.isIdentifier(name)) check(name.text);
        else for (const element of name.elements) if (ts.isBindingElement(element)) binding(element.name);
      };
      for (const node of source.statements) {
        if (ts.isExportDeclaration(node)) {
          if (node.isTypeOnly) continue;
          if (node.exportClause && ts.isNamedExports(node.exportClause)) {
            for (const element of node.exportClause.elements) if (!element.isTypeOnly) check(element.name.text);
          } else check('*');
          continue;
        }
        if (ts.isExportAssignment(node)) { check('default'); continue; }
        const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
        if (!modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
        if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) continue;
        if (modifiers.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword)) { check('default'); continue; }
        if (ts.isVariableStatement(node)) {
          for (const declaration of node.declarationList.declarations) binding(declaration.name);
        } else if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isEnumDeclaration(node)) {
          if (node.name) check(node.name.text);
        }
      }
    }
    expect(unexpected).toEqual([]);
  });

  it('preserves the reusable handlers and route cache policy', async () => {
    const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
    expect(read('app/api/spokedu-master/programs/route.ts')).toContain('export const revalidate = 60;');
    expect(read('app/api/spokedu-master/programs/route.ts')).toContain("export { GET, PATCH } from './programCatalogHandlers'");
    expect(read('app/admin/spokedu-master/programs/page.tsx')).toContain("export { default } from './ProgramsAdmin'");
    expect(read('app/(spokedu-public)/subscription/page.tsx')).toContain("export { metadata, default } from './SpokeduLabLanding'");
    expect(read('app/(spokedu-public)/spokedu-lab/page.tsx')).toContain("from '../subscription/SpokeduLabLanding'");
  });
});
