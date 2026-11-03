export { default } from './website/pages/home';
import { buildSpokeduMetadata } from './data/seo';
export const metadata = buildSpokeduMetadata('home');
export const revalidate = 86400;
