import { createHash } from 'node:crypto';

export const LEGACY_BUCKET = 'iiwarmup-files';
export const PRIVATE_BUCKET = 'spokedu-center-criminal-checks';
export const OPS_PROJECT_REF = 'mwgvserdyflsqyhcqecp';
export const LOCAL_PROJECT_REF = 'local';

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function projectRefFromUrl(value) {
  const hostname = new URL(value).hostname;
  if (hostname === '127.0.0.1' || hostname === 'localhost') {
    return LOCAL_PROJECT_REF;
  }
  const [ref, ...suffix] = hostname.split('.');
  if (!ref || suffix.join('.') !== 'supabase.co') {
    throw new Error('Supabase URL must use the project-ref.supabase.co host.');
  }
  return ref;
}

export function normalizeCenterFiles(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid criminal_check_files entry.');
    if (typeof entry.name !== 'string' || typeof entry.path !== 'string') {
      throw new Error('A criminal_check_files entry is missing name or path.');
    }
    return {
      name: entry.name,
      path: entry.path,
      ...(typeof entry.bucket === 'string' && entry.bucket ? { bucket: entry.bucket } : {}),
    };
  });
}

export function centerFilesFingerprint(files) {
  return sha256(JSON.stringify(normalizeCenterFiles(files)));
}

export function pathIdentifier(bucket, path) {
  return sha256(`${bucket}:${path}`).slice(0, 16);
}

export function isCenterPath(centerId, path) {
  const prefix = `centers/${centerId}/criminal-check/`;
  return path.startsWith(prefix) && path.length > prefix.length && !path.includes('..') && !path.startsWith('/');
}

export function buildMigrationPlan({ centers, sourceObjects, expectedReferenced = 19, expectedUnreferenced = 3 }) {
  const references = [];
  const seenPaths = new Set();

  for (const center of centers) {
    if (!center || typeof center.id !== 'string') throw new Error('Center row is missing an id.');
    const files = normalizeCenterFiles(center.criminal_check_files);
    for (const file of files) {
      const bucket = file.bucket || LEGACY_BUCKET;
      if (bucket !== LEGACY_BUCKET && bucket !== PRIVATE_BUCKET) {
        throw new Error(`Unsupported criminal-check bucket on center ${center.id}.`);
      }
      if (!isCenterPath(center.id, file.path)) {
        throw new Error(`Invalid criminal-check path ownership on center ${center.id}.`);
      }
      if (seenPaths.has(file.path)) throw new Error('Duplicate criminal-check source path detected.');
      seenPaths.add(file.path);
      references.push({ centerId: center.id, centerFiles: files, file, bucket });
    }
  }

  if (references.length !== expectedReferenced) {
    throw new Error(`Expected ${expectedReferenced} referenced files, found ${references.length}.`);
  }

  const sourcePathSet = new Set(sourceObjects.map((object) => object.path));
  for (const reference of references) {
    if (!sourcePathSet.has(reference.file.path)) {
      throw new Error(`Referenced source object is missing (${pathIdentifier(LEGACY_BUCKET, reference.file.path)}).`);
    }
  }

  const unreferenced = sourceObjects.filter((object) => !seenPaths.has(object.path));
  if (unreferenced.length !== expectedUnreferenced) {
    throw new Error(`Expected ${expectedUnreferenced} unreferenced files, found ${unreferenced.length}.`);
  }

  return {
    references,
    jobs: references.filter((reference) => reference.bucket === LEGACY_BUCKET),
    unreferenced,
  };
}

export function transitionCenterFiles(currentValue, centerId, sourcePath) {
  const current = normalizeCenterFiles(currentValue);
  const index = current.findIndex((file) =>
    file.path === sourcePath && (file.bucket || LEGACY_BUCKET) === LEGACY_BUCKET
  );
  if (index < 0) throw new Error('Source reference changed before database transition.');
  if (!isCenterPath(centerId, sourcePath)) throw new Error('Source path no longer belongs to the center.');
  const next = current.map((file, fileIndex) => fileIndex === index
    ? { ...file, bucket: PRIVATE_BUCKET }
    : file
  );
  return { current, next };
}

export function contentTypeFromObject(object) {
  return object?.metadata?.mimetype || object?.metadata?.contentType || null;
}

export function sizeFromObject(object) {
  const size = object?.metadata?.size;
  return Number.isFinite(Number(size)) ? Number(size) : null;
}
