import * as legacy from '../../spokedu/programs/spomove/page';
import * as stitch from '../../spokedu/stitch/c0/pages/spomove';
import { isStitchC0Enabled } from '../../spokedu/stitch/c0/flags';

const mod = isStitchC0Enabled() ? stitch : legacy;

export default mod.default;
export const metadata = mod.metadata;
