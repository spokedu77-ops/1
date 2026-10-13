import { describe, expect, it } from 'vitest';
import {
  masterRouteNeedsExplanationData,
  masterRouteNeedsFavoriteSync,
  masterRouteNeedsOperationalData,
  masterRouteNeedsProgramCatalog,
  normalizeMasterAppPath,
} from './AppShell';

describe('AppShell data provider scope', () => {
  it.each([
    '/spokedu-lab/dashboard',
    '/spokedu-lab/library',
    '/spokedu-lab/library/52',
    '/spokedu-lab/manage',
    '/spokedu-lab/classes/class-id',
    '/spokedu-lab/students',
    '/spokedu-lab/class-tools',
    '/spokedu-lab/spomove',
    '/spokedu-lab/profile',
  ])('keeps operational data on consuming route %s', (pathname) => {
    expect(masterRouteNeedsOperationalData(pathname, '/spokedu-lab')).toBe(true);
  });

  it.each([
    '/spokedu-lab/favorites',
    '/spokedu-lab/programs',
    '/spokedu-lab/subscription',
    '/spokedu-lab/payment',
    '/spokedu-lab/shop',
  ])('does not load operational data on independent route %s', (pathname) => {
    expect(masterRouteNeedsOperationalData(pathname, '/spokedu-lab')).toBe(false);
  });

  it('loads explanation history only for profile', () => {
    expect(masterRouteNeedsExplanationData('/spokedu-lab/profile', '/spokedu-lab')).toBe(true);
    expect(masterRouteNeedsExplanationData('/spokedu-lab/dashboard', '/spokedu-lab')).toBe(false);
    expect(masterRouteNeedsExplanationData('/spokedu-lab/library/52', '/spokedu-lab')).toBe(false);
  });

  it('supports the internal master alias without changing scope', () => {
    expect(masterRouteNeedsOperationalData('/spokedu-master/manage', '/spokedu-master')).toBe(true);
    expect(masterRouteNeedsOperationalData('/spokedu-master/favorites', '/spokedu-master')).toBe(false);
  });

  it('loads catalogs and favorites only on surfaces that consume them', () => {
    expect(masterRouteNeedsProgramCatalog('/spokedu-lab/library', '/spokedu-lab')).toBe(true);
    expect(masterRouteNeedsProgramCatalog('/spokedu-lab/manage', '/spokedu-lab')).toBe(true);
    expect(masterRouteNeedsProgramCatalog('/spokedu-lab/classes', '/spokedu-lab')).toBe(false);
    expect(masterRouteNeedsFavoriteSync('/spokedu-lab/favorites', '/spokedu-lab')).toBe(true);
    expect(masterRouteNeedsFavoriteSync('/spokedu-lab/spomove', '/spokedu-lab')).toBe(true);
    expect(masterRouteNeedsFavoriteSync('/spokedu-lab/students', '/spokedu-lab')).toBe(false);
  });

  it('normalizes the internal rewrite path to the canonical LAB path', () => {
    expect(normalizeMasterAppPath('/spokedu-master')).toBe('/spokedu-lab');
    expect(normalizeMasterAppPath('/spokedu-master/dashboard')).toBe('/spokedu-lab/dashboard');
    expect(normalizeMasterAppPath('/spokedu-lab/dashboard')).toBe('/spokedu-lab/dashboard');
  });
});
