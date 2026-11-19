// Compatibility entry: current public behavior checks; no historical design snapshots.
import { runPublicQa } from './lib/spokedu-public-qa.mjs';

runPublicQa().catch(error => { console.error(error.message); process.exitCode = 1; });
