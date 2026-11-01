import * as legacy from '../../spokedu/records/page';
import * as stitch from '../../spokedu/stitch/c0/pages/records';
import { isStitchC0Enabled } from '../../spokedu/stitch/c0/flags';

const mod = isStitchC0Enabled() ? stitch : legacy;

export default mod.default;
export const metadata = mod.metadata;
export const revalidate = 86400;
