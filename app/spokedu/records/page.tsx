export { default } from '../website/pages/records';
import { buildSpokeduMetadata } from '../data/seo';
export const metadata = buildSpokeduMetadata('records');
export const revalidate = 86400;
